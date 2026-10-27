import { useSyncExternalStore } from 'react';

import type { LyricSize } from '@/design-system/tokens';
import { storage } from './storage';

// Everything the person changes lives on the device: no account, no server.
export type ThemePreference = 'auto' | 'light' | 'dark';
export type Typeface = 'serif' | 'sans';

export type Settings = {
  lyricSize: LyricSize;
  typeface: Typeface;
  theme: ThemePreference;
  verseNumbers: boolean;
  keepAwake: boolean;
};

export type RecentEntry = { number: number; openedAt: number };
export type Position = { number: number; verse: number; total: number };

type State = {
  settings: Settings;
  favorites: number[]; // newest first
  recent: RecentEntry[]; // newest first
  position: Position | null;
};

const KEY = 'hoziana/user-state/v1';

const defaults: State = {
  settings: { lyricSize: 20, typeface: 'serif', theme: 'auto', verseNumbers: true, keepAwake: true },
  favorites: [],
  recent: [],
  position: null,
};

function load(): State {
  try {
    const raw = storage.get(KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<State>;
    return { ...defaults, ...saved, settings: { ...defaults.settings, ...saved.settings } };
  } catch {
    return defaults;
  }
}

let state = load();
const listeners = new Set<() => void>();

function update(change: (s: State) => State) {
  state = change(state);
  storage.set(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useUserState<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

export const userActions = {
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  },
  toggleFavorite(number: number) {
    update((s) => ({
      ...s,
      favorites: s.favorites.includes(number) ? s.favorites.filter((n) => n !== number) : [number, ...s.favorites],
    }));
  },
  opened(number: number) {
    update((s) => ({
      ...s,
      recent: [{ number, openedAt: Date.now() }, ...s.recent.filter((r) => r.number !== number)].slice(0, 20),
    }));
  },
  setPosition(position: Position) {
    const p = state.position;
    if (p && p.number === position.number && p.verse === position.verse) return;
    update((s) => ({ ...s, position }));
  },
};
