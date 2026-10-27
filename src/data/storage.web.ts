// The web build is only used for quick previews, so plain localStorage is enough.
export const storage = {
  get: (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  set: (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
};
