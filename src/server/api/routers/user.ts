import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { profilePresets, users, userTemperatureProfile } from "~/server/db/schema";
import { cookies } from "next/headers";
import {
  authenticate,
  obtainFreshAccessToken,
  AuthError,
} from "~/server/eight/auth";
import { and, asc, eq } from "drizzle-orm";
import { type Token } from "~/server/eight/types";
import { TRPCError } from "@trpc/server";
import { adjustTemperature } from "~/app/api/temperatureCron/route";
import { getPodDisplayStatus } from "~/server/eight/user";
import { setHeatingLevel, turnOffSide, turnOnSide } from "~/server/eight/eight";
import {
  BUILTIN_PRESETS,
  toHHMM,
  type PresetDescriptor,
  type ScheduleValues,
} from "~/lib/presets";
import jwt from "jsonwebtoken";

class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

const AUTH_COOKIE = "8slpAutht";
const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year, renewed on every app open
const DEVICE_TOKEN_EXPIRY = "400d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment");
  }
  return secret;
}

function getApprovedEmails(): string[] {
  return (process.env.APPROVED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isApprovedEmail(email: string): boolean {
  return getApprovedEmails().includes(email.toLowerCase());
}

// SameSite=Lax (not Strict): Android launches installed web apps from the home
// screen as an external navigation, and Chrome withholds Strict cookies there.
function setAuthCookie(email: string) {
  const token = jwt.sign({ email }, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

function clearAuthCookie() {
  cookies().set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// Long-lived token kept in the installed app's localStorage, used to restore the
// cookie session if the browser ever drops it.
function signDeviceToken(email: string): string {
  return jwt.sign({ email, typ: "device" }, getJwtSecret(), { expiresIn: DEVICE_TOKEN_EXPIRY });
}

const checkAuthCookie = async (headers: Headers) => {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    throw new AuthError(`Auth request failed. No cookies found.`, 401);
  }

  const token = cookieHeader
    .split(";")
    .map((row) => row.trim())
    .find((row) => row.startsWith(`${AUTH_COOKIE}=`))
    ?.split("=")[1];

  if (!token) {
    throw new AuthError(`Auth request failed. No cookies found.`, 401);
  }
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret()) as {
      email: string;
    };
  } catch {
    throw new AuthError(`Auth request failed. Invalid token.`, 401);
  }

  return decoded;
};

const isExpiredRefreshToken = (error: unknown) =>
  error instanceof AuthError && error.message.includes("Invalid or expired refresh token");

const getAuthUserAndToken = async (headers: Headers) => {
  const decoded = await checkAuthCookie(headers);

  const userList = await db
    .select()
    .from(users)
    .where(eq(users.email, decoded.email))
    .execute();

  const user = userList[0];
  if (userList.length !== 1 || user === undefined) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found.",
    });
  }

  let token: Token = {
    eightAccessToken: user.eightAccessToken,
    eightRefreshToken: user.eightRefreshToken,
    eightExpiresAtPosix: user.eightTokenExpiresAt.getTime(),
    eightUserId: user.eightUserId,
  };

  if (user.eightTokenExpiresAt < new Date()) {
    token = await obtainFreshAccessToken(
      token.eightRefreshToken,
      token.eightUserId,
    );
    await db
      .update(users)
      .set({
        eightAccessToken: token.eightAccessToken,
        eightRefreshToken: token.eightRefreshToken,
        eightTokenExpiresAt: new Date(token.eightExpiresAtPosix),
      })
      .where(eq(users.email, decoded.email))
      .execute();
  }

  return { user, token };
};

const requireEmail = async (headers: Headers) => {
  try {
    return (await checkAuthCookie(headers)).email;
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in again." });
  }
};

function toTRPCError(error: unknown, fallbackMessage: string): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof AuthError) {
    return new TRPCError({ code: "UNAUTHORIZED", message: error.message });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage });
}

const timeInput = z.string().regex(/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/, "Must be HH:MM");
const levelInput = z.number().int().min(-100).max(100);

const scheduleValuesInput = z.object({
  bedTime: timeInput,
  wakeupTime: timeInput,
  midStageSleepLevelStartTime: timeInput,
  finalSleepLevelStartTime: timeInput,
  initialSleepLevel: levelInput,
  midStageSleepLevel: levelInput,
  finalSleepLevel: levelInput,
  wakeupAlarmEnabled: z.boolean(),
  wakeupAlarmLevel: levelInput,
  wakeupAlarmLeadMinutes: z.number().int().min(5).max(120),
});

const presetMetaInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(160).default(""),
});

function scheduleFromRow(row: ScheduleValues): ScheduleValues {
  return {
    bedTime: toHHMM(row.bedTime),
    wakeupTime: toHHMM(row.wakeupTime),
    midStageSleepLevelStartTime: toHHMM(row.midStageSleepLevelStartTime),
    finalSleepLevelStartTime: toHHMM(row.finalSleepLevelStartTime),
    initialSleepLevel: row.initialSleepLevel,
    midStageSleepLevel: row.midStageSleepLevel,
    finalSleepLevel: row.finalSleepLevel,
    wakeupAlarmEnabled: row.wakeupAlarmEnabled,
    wakeupAlarmLevel: row.wakeupAlarmLevel,
    wakeupAlarmLeadMinutes: row.wakeupAlarmLeadMinutes,
  };
}

async function saveProfile(email: string, values: ScheduleValues, timezoneTZ: string) {
  const profileValues = {
    ...values,
    timezoneTZ,
    updatedAt: new Date(),
  };
  await db
    .insert(userTemperatureProfile)
    .values({ email, ...profileValues })
    .onConflictDoUpdate({
      target: userTemperatureProfile.email,
      set: profileValues,
    })
    .execute();
}

async function listCustomPresets(email: string): Promise<PresetDescriptor[]> {
  const rows = await db
    .select()
    .from(profilePresets)
    .where(eq(profilePresets.email, email))
    .orderBy(asc(profilePresets.createdAt))
    .execute();
  return rows.map((row) => ({
    ref: `custom:${row.id}`,
    name: row.name,
    description: row.description,
    builtin: false,
    values: scheduleFromRow(row),
  }));
}

// Applies the schedule right away; never fail the user's action if the pod is unreachable.
async function adjustTemperatureSafely() {
  try {
    await adjustTemperature();
  } catch (error) {
    console.error("Immediate temperature adjustment failed:", error);
  }
}

export const userRouter = createTRPCRouter({
  checkLoginState: publicProcedure.query(async ({ ctx }) => {
    try {
      let decoded;
      try {
        decoded = await checkAuthCookie(ctx.headers);
      } catch (error) {
        if (error instanceof AuthError) {
          return { loginRequired: true };
        }
        throw error;
      }
      const email = decoded.email;

      const userList = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .execute();

      if (userList.length !== 1 || userList[0] === undefined) {
        return { loginRequired: true };
      }

      const user = userList[0];

      // check if token is expired, and if so, refresh it
      if (user.eightTokenExpiresAt < new Date()) {
        console.log("Token expired, refreshing for user", user.email);
        try {
          const {
            eightAccessToken,
            eightRefreshToken,
            eightExpiresAtPosix: expiresAt,
          } = await obtainFreshAccessToken(
            user.eightRefreshToken,
            user.eightUserId,
          );

          await db
            .update(users)
            .set({
              eightAccessToken,
              eightRefreshToken,
              eightTokenExpiresAt: new Date(expiresAt),
            })
            .where(eq(users.email, email))
            .execute();
        } catch (error) {
          console.error("Token renewal failed:", error);
          // Only a rejected refresh token needs a new password. Network hiccups
          // or Eight Sleep outages should not kick the user out of the app.
          if (isExpiredRefreshToken(error)) {
            return { loginRequired: true };
          }
        }
      }
      return { loginRequired: false };
    } catch (error) {
      console.error("Error in checkLoginState:", error);
      throw new Error(
        "An unexpected error occurred while checking login state.",
      );
    }
  }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        if (!isApprovedEmail(input.email)) {
          throw new AuthError("Email not approved");
        }

        const authResult = await authenticateUser(input.email, input.password);

        await saveUserToDatabase(input.email, authResult);

        setAuthCookie(input.email);

        return {
          success: true,
          deviceToken: signDeviceToken(input.email),
        };
      } catch (error) {
        console.error("Error in login process:", error);
        if (error instanceof AuthError) {
          throw new Error(`Authentication failed: ${error.message}`);
        } else if (error instanceof DatabaseError) {
          throw new Error(
            "Failed to save login information. Please try again.",
          );
        } else {
          throw new Error(
            "An unexpected error occurred. Please try again later.",
          );
        }
      }
    }),

  // Called on every app open: slides the cookie expiry forward and rotates the device token.
  refreshSession: publicProcedure.mutation(async ({ ctx }) => {
    const email = await requireEmail(ctx.headers);
    if (!isApprovedEmail(email)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Email not approved." });
    }
    setAuthCookie(email);
    return { deviceToken: signDeviceToken(email) };
  }),

  resumeSession: publicProcedure
    .input(z.object({ deviceToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      let decoded: { email?: string; typ?: string };
      try {
        decoded = jwt.verify(input.deviceToken, getJwtSecret()) as typeof decoded;
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Device token expired." });
      }
      const email = decoded.email;
      if (decoded.typ !== "device" || !email || !isApprovedEmail(email)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Device token invalid." });
      }

      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found." });
      }

      setAuthCookie(email);
      return { success: true, deviceToken: signDeviceToken(email) };
    }),

  logout: publicProcedure.mutation(async () => {
    try {
      clearAuthCookie();
      return {
        success: true,
      };
    } catch (error) {
      console.error("Error during logout:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during logout.",
      });
    }
  }),

  getPodStatus: publicProcedure.query(async ({ ctx }) => {
    try {
      const { token } = await getAuthUserAndToken(ctx.headers);
      return await getPodDisplayStatus(token);
    } catch (error) {
      console.error("Error fetching pod status:", error);
      throw toTRPCError(error, "An unexpected error occurred while fetching pod status.");
    }
  }),

  setPodPower: publicProcedure
    .input(z.object({ isOn: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { user, token } = await getAuthUserAndToken(ctx.headers);
        if (input.isOn) {
          await turnOnSide(token, user.eightUserId);
        } else {
          await turnOffSide(token, user.eightUserId);
        }
        return { success: true, isOn: input.isOn };
      } catch (error) {
        console.error("Error setting pod power:", error);
        throw toTRPCError(error, "Failed to set pod power.");
      }
    }),

  setPodTargetLevel: publicProcedure
    .input(
      z.object({
        level: levelInput,
        turnOn: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user, token } = await getAuthUserAndToken(ctx.headers);
        if (input.turnOn) {
          await turnOnSide(token, user.eightUserId);
        }
        await setHeatingLevel(token, user.eightUserId, input.level);
        return { success: true, level: input.level };
      } catch (error) {
        console.error("Error setting pod target level:", error);
        throw toTRPCError(error, "Failed to set pod target level.");
      }
    }),

  // Returns null (not an error) when no schedule has been saved yet.
  getUserTemperatureProfile: publicProcedure.query(async ({ ctx }) => {
    const email = await requireEmail(ctx.headers);
    try {
      const profile = await db.query.userTemperatureProfile.findFirst({
        where: eq(userTemperatureProfile.email, email),
      });
      return profile ?? null;
    } catch (error) {
      console.error("Error fetching user temperature profile:", error);
      throw toTRPCError(
        error,
        "An unexpected error occurred while fetching the temperature profile.",
      );
    }
  }),

  updateUserTemperatureProfile: publicProcedure
    .input(scheduleValuesInput.extend({ timezoneTZ: z.string().max(50) }))
    .mutation(async ({ input, ctx }) => {
      const email = await requireEmail(ctx.headers);
      try {
        const { timezoneTZ, ...values } = input;
        await saveProfile(email, values, timezoneTZ);
        await adjustTemperatureSafely();
        return { success: true };
      } catch (error) {
        console.error("Error updating user temperature profile:", error);
        throw toTRPCError(
          error,
          "An unexpected error occurred while updating the temperature profile.",
        );
      }
    }),

  deleteUserTemperatureProfile: publicProcedure.mutation(async ({ ctx }) => {
    const email = await requireEmail(ctx.headers);
    try {
      const deleted = await db
        .delete(userTemperatureProfile)
        .where(eq(userTemperatureProfile.email, email))
        .returning({ email: userTemperatureProfile.email })
        .execute();

      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Temperature profile not found for this user.",
        });
      }

      return {
        success: true,
        message: "User temperature profile deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting user temperature profile:", error);
      throw toTRPCError(
        error,
        "An unexpected error occurred while deleting the user temperature profile.",
      );
    }
  }),

  // ---------- Presets ----------

  listPresets: publicProcedure.query(async ({ ctx }) => {
    const email = await requireEmail(ctx.headers);
    const custom = await listCustomPresets(email);
    return { builtin: BUILTIN_PRESETS, custom };
  }),

  createPreset: publicProcedure
    .input(presetMetaInput.extend({ values: scheduleValuesInput }))
    .mutation(async ({ input, ctx }) => {
      const email = await requireEmail(ctx.headers);
      try {
        const [row] = await db
          .insert(profilePresets)
          .values({
            email,
            name: input.name,
            description: input.description,
            ...input.values,
          })
          .returning({ id: profilePresets.id })
          .execute();
        return { ref: `custom:${row?.id}` };
      } catch (error) {
        console.error("Error creating preset:", error);
        throw toTRPCError(error, "Failed to save preset.");
      }
    }),

  updatePreset: publicProcedure
    .input(
      presetMetaInput.partial().extend({
        id: z.number().int(),
        values: scheduleValuesInput.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const email = await requireEmail(ctx.headers);
      const { id, values, ...meta } = input;
      const updated = await db
        .update(profilePresets)
        .set({ ...meta, ...values, updatedAt: new Date() })
        .where(and(eq(profilePresets.id, id), eq(profilePresets.email, email)))
        .returning({ id: profilePresets.id })
        .execute();
      if (updated.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found." });
      }
      return { success: true };
    }),

  deletePreset: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const email = await requireEmail(ctx.headers);
      await db
        .delete(profilePresets)
        .where(and(eq(profilePresets.id, input.id), eq(profilePresets.email, email)))
        .execute();
      return { success: true };
    }),

  applyPreset: publicProcedure
    .input(z.object({ ref: z.string(), timezoneTZ: z.string().max(50) }))
    .mutation(async ({ input, ctx }) => {
      const email = await requireEmail(ctx.headers);
      const presets = [...BUILTIN_PRESETS, ...(await listCustomPresets(email))];
      const preset = presets.find((p) => p.ref === input.ref);
      if (!preset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Preset not found." });
      }

      try {
        // Keep the timezone the user already chose; fall back to the device's.
        const existing = await db.query.userTemperatureProfile.findFirst({
          where: eq(userTemperatureProfile.email, email),
        });
        await saveProfile(email, preset.values, existing?.timezoneTZ ?? input.timezoneTZ);
        await adjustTemperatureSafely();
        return { success: true, name: preset.name };
      } catch (error) {
        console.error("Error applying preset:", error);
        throw toTRPCError(error, "Failed to apply preset.");
      }
    }),

  // ---------- Account, vacation & config ----------

  getAccount: publicProcedure.query(async ({ ctx }) => {
    const email = await requireEmail(ctx.headers);
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found." });
    }
    return {
      email: user.email,
      eightUserId: user.eightUserId,
      eightTokenExpiresAt: user.eightTokenExpiresAt,
      vacationMode: user.vacationMode,
      vacationUntil: user.vacationUntil,
      lastCronRunAt: user.lastCronRunAt,
      memberSince: user.createdAt,
    };
  }),

  setVacationMode: publicProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        until: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user, token } = await getAuthUserAndToken(ctx.headers);
        await db
          .update(users)
          .set({
            vacationMode: input.enabled,
            vacationUntil: input.enabled ? input.until ?? null : null,
            updatedAt: new Date(),
          })
          .where(eq(users.email, user.email))
          .execute();

        if (input.enabled) {
          try {
            await turnOffSide(token, user.eightUserId);
          } catch (error) {
            console.error("Could not turn pod off when enabling vacation mode:", error);
          }
        } else {
          await adjustTemperatureSafely();
        }
        return { success: true };
      } catch (error) {
        console.error("Error setting vacation mode:", error);
        throw toTRPCError(error, "Failed to update vacation mode.");
      }
    }),

  getAppConfig: publicProcedure.query(async ({ ctx }) => {
    const email = await requireEmail(ctx.headers);
    if (!isApprovedEmail(email)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Email not approved." });
    }
    const host = ctx.headers.get("x-forwarded-host") ?? ctx.headers.get("host") ?? "localhost:3000";
    const proto =
      ctx.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const cronSecret = process.env.CRON_SECRET ?? "";
    return {
      cronUrl: `${proto}://${host}/api/temperatureCron`,
      cronSecret,
      cronHeaderName: "Authorization",
      cronHeaderValue: `Bearer ${cronSecret}`,
      cronIntervalHint: "Every 15–30 minutes",
      approvedEmails: getApprovedEmails(),
    };
  }),

  runCronNow: publicProcedure.mutation(async ({ ctx }) => {
    await requireEmail(ctx.headers);
    try {
      await adjustTemperature();
      return { success: true, ranAt: new Date() };
    } catch (error) {
      console.error("Manual cron run failed:", error);
      throw toTRPCError(error, "Cron run failed. Check the server logs.");
    }
  }),
});

async function authenticateUser(email: string, password: string) {
  try {
    return await authenticate(email, password);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error; // Propagate the AuthError with its specific message
    } else {
      throw new AuthError("Failed to authenticate user");
    }
  }
}

async function saveUserToDatabase(email: string, authResult: Token) {
  try {
    await db
      .insert(users)
      .values({
        email,
        eightAccessToken: authResult.eightAccessToken,
        eightRefreshToken: authResult.eightRefreshToken,
        eightTokenExpiresAt: new Date(authResult.eightExpiresAtPosix),
        eightUserId: authResult.eightUserId,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          eightAccessToken: authResult.eightAccessToken,
          eightRefreshToken: authResult.eightRefreshToken,
          eightTokenExpiresAt: new Date(authResult.eightExpiresAtPosix),
          eightUserId: authResult.eightUserId,
          updatedAt: new Date(),
        },
      })
      .execute();
  } catch (error) {
    console.error("Database operation failed:", error);
    throw new DatabaseError("Failed to save user token to database.");
  }
}
