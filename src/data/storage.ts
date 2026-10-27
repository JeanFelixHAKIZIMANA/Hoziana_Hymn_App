import Storage from 'expo-sqlite/kv-store';

// Synchronous key-value storage backed by SQLite on the device.
export const storage = {
  get: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
};
