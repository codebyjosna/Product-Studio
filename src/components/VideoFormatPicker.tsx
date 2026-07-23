import React from 'react';
import {
  VIDEO_ASPECTS,
  VIDEO_DURATIONS,
  type VideoDurationSec,
} from '../lib/videoFormat';

interface VideoFormatPickerProps {
  aspectRatio: string;
  durationSec: VideoDurationSec;
  onAspectChange: (ratio: string) => void;
  onDurationChange: (sec: VideoDurationSec) => void;
  disabled?: boolean;
}

export function VideoFormatPicker({
  aspectRatio,
  durationSec,
  onAspectChange,
  onDurationChange,
  disabled = false,
}: VideoFormatPickerProps) {
  return (
    <div className={`mb-8 space-y-6 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-mist mb-3">
          Aspect ratio
        </div>
        <div className="grid grid-cols-2 gap-2">
          {VIDEO_ASPECTS.map((opt) => {
            const selected = aspectRatio === opt.ratio;
            return (
              <button
                key={opt.ratio}
                type="button"
                onClick={() => onAspectChange(opt.ratio)}
                disabled={disabled}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                  selected
                    ? 'border-accent/60 bg-accent-soft/40 text-snow'
                    : 'border-line bg-panel-elevated/60 text-fog hover:border-line-strong'
                }`}
              >
                <div className="text-sm font-semibold tracking-wide">{opt.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-mist">{opt.platforms}</div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-mist/80">
          Omni renders 16:9 or 9:16; other sizes are framed for your target crop.
        </p>
      </div>

      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-mist mb-3">
          Duration
        </div>
        <div className="flex flex-wrap gap-2">
          {VIDEO_DURATIONS.map((sec) => {
            const selected = durationSec === sec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => onDurationChange(sec)}
                disabled={disabled}
                className={`min-w-[4.5rem] rounded-lg border px-3 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
                  selected
                    ? 'border-accent/60 bg-accent-soft/40 text-snow'
                    : 'border-line bg-panel-elevated/60 text-fog hover:border-line-strong'
                }`}
              >
                {sec}s
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
