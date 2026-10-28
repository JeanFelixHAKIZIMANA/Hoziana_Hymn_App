import { useEffect, useState } from 'react';

import { supabase } from './supabase';

// Editors are signed out after an hour with no mouse, keyboard, scroll or touch activity.
// The last-activity time lives in localStorage, so every open tab shares it, and the check
// compares wall-clock times, so a laptop that slept past the limit signs out when it wakes.
export const IDLE_LIMIT_MS = 60 * 60 * 1000;
const WARN_BEFORE_MS = 5 * 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const WRITE_EVERY_MS = 10 * 1000;

const ACTIVITY_KEY = 'hoziana.lastActivity';
const REASON_KEY = 'hoziana.signedOutIdle';
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private windows can refuse storage; the in-memory timer still works for this tab.
  }
}

let lastActivity = Number(read(ACTIVITY_KEY)) || 0;

function latestActivity() {
  return Math.max(lastActivity, Number(read(ACTIVITY_KEY)) || 0);
}

export function touchActivity(now = Date.now()) {
  lastActivity = now;
  write(ACTIVITY_KEY, String(now));
}

/** True when a stored session has gone unused past the limit (e.g. the browser was closed for hours). */
export function isStale(now = Date.now()) {
  const last = latestActivity();
  return last > 0 && now - last >= IDLE_LIMIT_MS;
}

export async function signOutIdle() {
  write(REASON_KEY, '1');
  write(ACTIVITY_KEY, null);
  lastActivity = 0;
  // Local scope ends only this browser's session, not the editor's sessions on other devices.
  await supabase.auth.signOut({ scope: 'local' });
}

export const signedOutForIdle = () => read(REASON_KEY) === '1';
export const clearIdleReason = () => write(REASON_KEY, null);

/** Watches activity while signed in. Returns the minutes left once the warning window starts, else null. */
export function useIdleSignOut(active: boolean) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return setMinutesLeft(null);
    if (!latestActivity()) touchActivity();

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastWrite >= WRITE_EVERY_MS) {
        lastWrite = now;
        touchActivity(now);
      }
      setMinutesLeft(null);
    };

    let signingOut = false;
    const check = () => {
      const left = IDLE_LIMIT_MS - (Date.now() - latestActivity());
      if (left <= 0) {
        if (!signingOut) {
          signingOut = true;
          void signOutIdle();
        }
      } else {
        setMinutesLeft(left <= WARN_BEFORE_MS ? Math.ceil(left / 60000) : null);
      }
    };

    // Activity in another tab clears this tab's warning straight away.
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) check();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    EVENTS.forEach((name) => addEventListener(name, onActivity, { passive: true, capture: true }));
    addEventListener('storage', onStorage);
    addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, CHECK_EVERY_MS);
    check();

    return () => {
      EVENTS.forEach((name) => removeEventListener(name, onActivity, { capture: true }));
      removeEventListener('storage', onStorage);
      removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [active]);

  return minutesLeft;
}
