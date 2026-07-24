import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Loader2 } from 'lucide-react';
import { SuggestionChip, MediaSelection } from '../data.js';
import { fileToDownscaledDataUrl, dataUrlToInline } from '../images.js';
import { useAuth } from '../auth/AuthContext';
import { apiFetch, readApiJson } from '../lib/api';
import { uploadUserMedia } from '../lib/mediaStorage';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface ImageUploaderProps {
  title: string;
  type: 'product' | 'atmosphere';
  suggestions: SuggestionChip[];
  selection: MediaSelection | null;
  onSelect: React.Dispatch<React.SetStateAction<MediaSelection | null>>;
  disabled?: boolean;
}

export function ImageUploader({
  title,
  type,
  suggestions,
  selection,
  onSelect,
  disabled = false,
}: ImageUploaderProps) {
  const { user, canGenerate, generationCost, refreshSession } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requireSignIn = () => {
    navigate('/signin', { state: { from: 'generate' } });
  };

  const ensureCanGenerate = () => {
    if (!canGenerate) {
      setError(`Out of tokens. Each generation uses ${generationCost} tokens.`);
      navigate('/upgrade', { state: { reason: 'tokens' } });
      return false;
    }
    return true;
  };

  const handleChipClick = (suggestion: SuggestionChip) => {
    if (disabled || generating) return;
    setPromptText(suggestion.prompt);
    setError(null);
  };

  const handleGenerate = async () => {
    if (disabled) return;
    if (!user) {
      requireSignIn();
      return;
    }
    const prompt = promptText.trim();
    if (!prompt) {
      setError('Please write or select a prompt first.');
      return;
    }
    // Local UX gate only — server charges tokens on generate.
    if (!ensureCanGenerate()) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await apiFetch('/api/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt, type }),
      });

      const data = await readApiJson<{ error?: string; imageUrl?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.imageUrl) {
        onSelect({
          id: `generated-${Date.now()}`,
          source: 'upload',
          images: [data.imageUrl],
          description: prompt,
        });
        void refreshSession();
      } else {
        throw new Error('Image URL not returned from backend');
      }
    } catch (err: any) {
      console.error('Error in image generation:', err);
      setError(err.message || 'Failed to generate image. Please try again.');
      void refreshSession();
    } finally {
      setGenerating(false);
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (disabled || generating) return;
    if (!user) {
      requireSignIn();
      return;
    }
    const picked = Array.from(fileList ?? []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (picked.length === 0) return;

    if (picked[0].size > MAX_UPLOAD_BYTES) {
      setError('Image must be 10MB or smaller.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDownscaledDataUrl(picked[0]);
      const uploadId = `upload-${Date.now()}`;
      onSelect({
        id: uploadId,
        source: 'upload',
        images: [dataUrl],
        description: `Uploaded reference photo`,
      });
      setError(null);

      // ERR-122: describe uploaded reference for better prompts
      void (async () => {
        try {
          const inline = dataUrlToInline(dataUrl);
          const res = await apiFetch('/api/describe', {
            method: 'POST',
            body: JSON.stringify({ type, images: [inline] }),
          });
          const data = await readApiJson<{ description?: string; error?: string }>(res);
          if (res.ok && data.description?.trim()) {
            onSelect((prev) =>
              prev && prev.id === uploadId
                ? { ...prev, description: data.description!.trim() }
                : prev
            );
          }
        } catch (err) {
          console.warn('Describe after upload skipped:', err);
        }
      })();

      // Persist original file to Supabase Storage (non-blocking for studio UX)
      const bucket = type === 'product' ? 'product-uploads' : 'atmosphere-uploads';
      void uploadUserMedia(bucket, picked[0], type).catch((err) => {
        console.warn('Supabase storage upload skipped:', err?.message || err);
      });
    } catch (err: any) {
      setError('Failed to process uploaded file.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onSelect(null);
    setError(null);
  };

  const hasSelection = !!selection && selection.images.length > 0;
  const uploadBlocked = disabled || generating;

  return (
    <div className="mb-8 p-5 rounded-xl border border-line/90 bg-panel-elevated/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <h2 className="text-sm font-semibold tracking-wide text-fog mb-4 flex items-center justify-between">
        <span className="uppercase">{title}</span>
        {generating && (
          <span className="flex items-center gap-1.5 text-xs text-mist font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
            Generating...
          </span>
        )}
      </h2>

      {hasSelection ? (
        <div className="space-y-3">
          <div className="relative group w-full aspect-[4/3] rounded-lg overflow-hidden bg-ink border border-line">
            <img
              src={selection.images[0]}
              alt={selection.description}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {!disabled && (
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-ink/85 hover:bg-ink text-snow rounded-md transition-colors border border-line"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-3 pt-8">
              <p className="text-xs font-medium text-fog line-clamp-2 leading-relaxed">
                {selection.description}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={handleClear}
              className="w-full py-2.5 text-xs font-semibold tracking-wide text-mist hover:text-snow transition-colors bg-panel border border-line rounded-lg hover:border-line-strong"
            >
              Reset and generate new
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <textarea
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                setError(null);
              }}
              disabled={disabled || generating}
              placeholder={`Describe the desired ${type} (e.g. "a colorful ceramic mug on a table"...)`}
              rows={3}
              className="w-full bg-ink/70 border border-line text-fog p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 rounded-lg resize-none placeholder-mist/40"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist/80">Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChipClick(item)}
                  disabled={disabled || generating}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    promptText === item.prompt
                      ? 'bg-accent text-ink border-accent shadow-[0_0_16px_rgba(45,212,191,0.25)]'
                      : 'bg-ink/50 text-mist border-line hover:border-line-strong hover:text-fog'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={disabled || generating || !promptText.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-snow hover:bg-fog text-ink text-sm font-semibold tracking-wide rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate {type} image
              </>
            )}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-line"></div>
            <span className="flex-shrink mx-3 text-[11px] font-medium text-mist/60">or upload your own image</span>
            <div className="flex-grow border-t border-line"></div>
          </div>

          <div
            onClick={() => !uploadBlocked && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!uploadBlocked) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!uploadBlocked) handleFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={uploadBlocked ? -1 : 0}
            aria-disabled={uploadBlocked}
            className={`border border-dashed p-4 text-center rounded-lg transition-all ${
              uploadBlocked
                ? 'border-line bg-ink/20 opacity-50 cursor-not-allowed'
                : dragging
                ? 'border-accent bg-accent/10 cursor-pointer'
                : 'border-line hover:border-line-strong bg-ink/30 cursor-pointer'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              <Plus className={`w-4 h-4 ${dragging ? 'text-accent' : 'text-mist'}`} />
              <span className="text-xs font-medium text-mist">
                Drop your reference photo or click to browse
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-danger bg-danger-soft/40 border border-danger/30 p-2.5 rounded-lg">
              {error}
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploadBlocked}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
