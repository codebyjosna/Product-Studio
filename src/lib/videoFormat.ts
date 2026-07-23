/** Studio output format presets — social + YouTube. */

export type VideoDurationSec = 10 | 20 | 30 | 60;

export interface VideoAspectOption {
  /** Canonical ratio string sent to APIs / prompts, e.g. "9:16" */
  ratio: string;
  label: string;
  /** Short platform hint under the chip */
  platforms: string;
}

/** Omni Flash currently accepts only 16:9 and 9:16 for video. */
export type OmniAspectRatio = '16:9' | '9:16';

export const VIDEO_DURATIONS: readonly VideoDurationSec[] = [10, 20, 30, 60];

export const VIDEO_ASPECTS: readonly VideoAspectOption[] = [
  { ratio: '16:9', label: '16:9', platforms: 'YouTube, Facebook, LinkedIn, X' },
  { ratio: '9:16', label: '9:16', platforms: 'TikTok, Reels, Shorts, Stories' },
  { ratio: '1:1', label: '1:1', platforms: 'Instagram, Facebook, X feed' },
  { ratio: '4:5', label: '4:5', platforms: 'Instagram feed portrait' },
  { ratio: '4:3', label: '4:3', platforms: 'Facebook, classic landscape' },
  { ratio: '3:4', label: '3:4', platforms: 'Pinterest, vertical feed' },
  { ratio: '2:3', label: '2:3', platforms: 'Pinterest pin' },
  { ratio: '21:9', label: '21:9', platforms: 'Cinematic / ultrawide' },
];

export const DEFAULT_ASPECT_RATIO = '16:9';
export const DEFAULT_DURATION_SEC: VideoDurationSec = 10;

export function isVideoDuration(n: unknown): n is VideoDurationSec {
  return typeof n === 'number' && (VIDEO_DURATIONS as readonly number[]).includes(n);
}

export function isVideoAspectRatio(s: unknown): s is string {
  return typeof s === 'string' && VIDEO_ASPECTS.some((a) => a.ratio === s);
}

/** Map any studio preset to the nearest Omni-supported video aspect. */
export function toOmniAspectRatio(ratio: string): OmniAspectRatio {
  const [wRaw, hRaw] = ratio.split(':');
  const w = Number(wRaw);
  const h = Number(hRaw);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '16:9';
  return h > w ? '9:16' : '16:9';
}

export function shotCeilingForDuration(durationSec: number): { min: number; max: number } {
  if (durationSec >= 60) return { min: 10, max: 24 };
  if (durationSec >= 30) return { min: 6, max: 16 };
  if (durationSec >= 20) return { min: 4, max: 12 };
  return { min: 2, max: 7 };
}

/** CSS aspect-ratio value, e.g. "16 / 9" */
export function cssAspectRatio(ratio: string): string {
  const [w, h] = ratio.split(':');
  return `${w} / ${h}`;
}

export function isPortraitRatio(ratio: string): boolean {
  const [wRaw, hRaw] = ratio.split(':');
  const w = Number(wRaw);
  const h = Number(hRaw);
  return Number.isFinite(w) && Number.isFinite(h) && h > w;
}

export function normalizeVideoFormat(body: {
  durationSec?: unknown;
  aspectRatio?: unknown;
}): { durationSec: VideoDurationSec; aspectRatio: string } {
  const durationSec = isVideoDuration(Number(body.durationSec))
    ? (Number(body.durationSec) as VideoDurationSec)
    : DEFAULT_DURATION_SEC;
  const aspectRatio = isVideoAspectRatio(body.aspectRatio) ? String(body.aspectRatio) : DEFAULT_ASPECT_RATIO;
  return { durationSec, aspectRatio };
}
