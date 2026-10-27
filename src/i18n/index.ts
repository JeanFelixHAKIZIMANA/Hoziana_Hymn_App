import { en } from './en';

// Version 1 ships English only. Kinyarwanda (rw) is planned for version 2:
// add src/i18n/rw.ts with the same keys and pick the strings from the
// language setting here.
export type Strings = typeof en;

export const strings: Strings = en;

export const t = strings;
