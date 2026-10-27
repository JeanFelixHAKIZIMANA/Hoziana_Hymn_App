// Hymn content types, shared by the app and the content website (admin/). No React Native imports.
export type LyricLine = {
  text: string;
  repeat?: number;
  part?: string;
  // Starts a new section inside the stanza (e.g. where a Gore/Bose exchange begins).
  gap?: boolean;
  // A cue printed in the book, such as "Inyikirizo:" (sing the refrain here).
  heading?: 'refrain';
};

export type Stanza = {
  // 'spoken' is a reading ("Ijambo:") between sung parts.
  type: 'verse' | 'refrain' | 'spoken';
  number?: number;
  lines: LyricLine[];
  inferred?: boolean;
  // The rest of a verse or refrain after a spoken passage.
  continued?: boolean;
};

export type Hymn = {
  number: number;
  title: string;
  titleUpper: string;
  key: string | null;
  scripture: string | null;
  volume: string | null;
  volumeYear: number | null;
  stanzas: Stanza[];
  credit: string | null;
  author: string | null;
  year: number | null;
};
