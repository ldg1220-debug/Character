// Module-level singleton: avoids React re-renders while sharing
// real-time viseme data between audio analyzer and avatar renderer.

export const VISEMES = [
  'viseme_sil',
  'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
  'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
  'viseme_aa', 'viseme_E',  'viseme_I',  'viseme_O',  'viseme_U',
] as const;

export type VisemeName = typeof VISEMES[number];

export const visemeState = {
  target:  Object.fromEntries(VISEMES.map(v => [v, 0])) as Record<VisemeName, number>,
  current: Object.fromEntries(VISEMES.map(v => [v, 0])) as Record<VisemeName, number>,
  speaking: false,
};
