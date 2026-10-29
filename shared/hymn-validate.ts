// Shape checks for hymn content that arrives from outside the app (the content
// website's database, or the copy saved on the phone). A row that fails is
// skipped, so one bad edit can't stop the app from opening. No React Native imports.

import type { Hymn, LyricLine, Stanza } from './hymnal-types';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || v === null || check(v);
const isString = (v: unknown) => typeof v === 'string';
const isWholeNumber = (v: unknown) => Number.isInteger(v);

function isLine(v: unknown): v is LyricLine {
  return (
    isObject(v) &&
    isString(v.text) &&
    optional(v.repeat, isWholeNumber) &&
    optional(v.part, isString) &&
    optional(v.gap, (g) => typeof g === 'boolean') &&
    optional(v.heading, (h) => h === 'refrain')
  );
}

function isStanza(v: unknown): v is Stanza {
  return (
    isObject(v) &&
    (v.type === 'verse' || v.type === 'refrain' || v.type === 'spoken') &&
    optional(v.number, isWholeNumber) &&
    Array.isArray(v.lines) &&
    v.lines.every(isLine)
  );
}

export const isStanzas = (v: unknown): v is Stanza[] => Array.isArray(v) && v.every(isStanza);

export function isHymn(v: unknown): v is Hymn {
  return (
    isObject(v) &&
    isWholeNumber(v.number) &&
    (v.number as number) > 0 &&
    isString(v.title) &&
    isString(v.titleUpper) &&
    optional(v.key, isString) &&
    optional(v.scripture, isString) &&
    optional(v.volume, isString) &&
    optional(v.volumeYear, isWholeNumber) &&
    optional(v.credit, isString) &&
    optional(v.author, isString) &&
    optional(v.year, isWholeNumber) &&
    isStanzas(v.stanzas)
  );
}
