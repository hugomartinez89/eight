// localStorage can throw (private mode, blocked storage), so every access is guarded.

const DEVICE_TOKEN_KEY = "podhub-device-token";

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export const getDeviceToken = () => readStorage(DEVICE_TOKEN_KEY);
export const setDeviceToken = (token: string | null) => writeStorage(DEVICE_TOKEN_KEY, token);

export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignore
  }
}
