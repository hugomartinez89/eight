import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTableCreator,
  serial,
  text,
  time,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `8slp_${name}`); // also in drizzle.config.ts

export const users = createTable("users", {
  email: varchar("email", { length: 255 }).notNull().primaryKey(),
  eightUserId: varchar("eightUserId", { length: 255 }).notNull(),
  eightAccessToken: text("access_token").notNull(),
  eightRefreshToken: text("refresh_token").notNull(),
  eightTokenExpiresAt: timestamp("expires_at").notNull(),
  vacationMode: boolean("vacationMode").default(false).notNull(),
  vacationUntil: timestamp("vacationUntil"),
  lastCronRunAt: timestamp("lastCronRunAt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profilePresets = createTable("profilePresets", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).references(() => users.email).notNull(),
  name: varchar("name", { length: 60 }).notNull(),
  description: varchar("description", { length: 160 }).default("").notNull(),
  bedTime: time("bedTime").notNull(),
  wakeupTime: time("wakeupTime").notNull(),
  initialSleepLevel: integer("initialSleepLevel").notNull(),
  midStageSleepLevel: integer("midStageSleepLevel").notNull(),
  midStageSleepLevelStartTime: time("midStageSleepLevelStartTime").notNull(),
  finalSleepLevel: integer("finalSleepLevel").notNull(),
  finalSleepLevelStartTime: time("finalSleepLevelStartTime").notNull(),
  wakeupAlarmEnabled: boolean("wakeupAlarmEnabled").default(false).notNull(),
  wakeupAlarmLevel: integer("wakeupAlarmLevel").default(0).notNull(),
  wakeupAlarmLeadMinutes: integer("wakeupAlarmLeadMinutes").default(30).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userTemperatureProfile = createTable("userTemperatureProfiles", {
  email: varchar('email', { length: 255 }).references(() => users.email).primaryKey(),
  bedTime: time("bedTime").notNull(),
  wakeupTime: time("wakeupTime").notNull(),
  initialSleepLevel: integer("initialSleepLevel").notNull(),
  midStageSleepLevel: integer("midStageSleepLevel").notNull(),
  midStageSleepLevelStartTime: time("midStageSleepLevelStartTime").notNull(),
  finalSleepLevel: integer("finalSleepLevel").notNull(),
  finalSleepLevelStartTime: time("finalSleepLevelStartTime").notNull(),
  wakeupAlarmEnabled: boolean("wakeupAlarmEnabled").default(false).notNull(),
  wakeupAlarmLevel: integer("wakeupAlarmLevel").default(0).notNull(),
  wakeupAlarmLeadMinutes: integer("wakeupAlarmLeadMinutes").default(30).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  timezoneTZ: varchar("timezone", { length: 50 }).notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  temperatureProfile: one(userTemperatureProfile, {
    fields: [users.email],
    references: [userTemperatureProfile.email],
  }),
}));

export const userTemperatureProfileRelations = relations(userTemperatureProfile, ({ one }) => ({
  user: one(users, {
    fields: [userTemperatureProfile.email],
    references: [users.email],
  }),
}));
