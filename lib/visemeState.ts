// Avaturn uses ARKit blend shapes (52 facial targets).
// This replaces the old RPM Oculus Viseme names.

export const ARKIT_LIP = [
  'jawOpen',
  'mouthFunnel',   // O 모양
  'mouthPucker',   // U 모양
  'mouthSmileLeft', 'mouthSmileRight',     // E/I — 입꼬리 옆
  'mouthStretchLeft', 'mouthStretchRight', // 넓은 소리
  'mouthLowerDownLeft', 'mouthLowerDownRight', // 아래턱 보조
  'mouthUpperUpLeft', 'mouthUpperUpRight', // 윗입술 열기
  'mouthDimpleLeft', 'mouthDimpleRight',   // 보조 움직임
  'mouthPressLeft', 'mouthPressRight',     // 자음 압력
  'mouthRollLower', 'mouthRollUpper',      // 입술 말기
  'mouthShrugLower', 'mouthShrugUpper',
] as const;

export const ARKIT_EYE = [
  'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
] as const;

export const ARKIT_BROW = [
  'browDownLeft', 'browDownRight',
  'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight',
] as const;

export const ARKIT_ALL = [...ARKIT_LIP, ...ARKIT_EYE, ...ARKIT_BROW] as const;
export type ARKitShape = typeof ARKIT_ALL[number];

// Module-level singleton — shared between audio hook and avatar renderer
// without triggering React re-renders at 60 fps.
export const lipState = {
  target:  Object.fromEntries(ARKIT_LIP.map(k => [k, 0])) as Record<string, number>,
  current: Object.fromEntries(ARKIT_LIP.map(k => [k, 0])) as Record<string, number>,
  speaking: false,
};

// Also keep legacy Oculus viseme keys for backwards compat / fallback GLBs
export const LEGACY_VISEMES = [
  'viseme_sil','viseme_PP','viseme_FF','viseme_TH','viseme_DD',
  'viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR',
  'viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U',
] as const;

export const legacyLipState = {
  target:  Object.fromEntries(LEGACY_VISEMES.map(k => [k, 0])) as Record<string, number>,
  current: Object.fromEntries(LEGACY_VISEMES.map(k => [k, 0])) as Record<string, number>,
};
