import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ArrowRight, ChevronRight, Download, Plus, Mic, ArrowUp, PanelLeft } from 'lucide-react';
import { MediaSelection, SuggestionChip } from '../data.js';
import { loadStudioPresets } from '../lib/catalog';
import { ImageUploader } from '../components/ImageUploader.js';
import { VideoOutput } from '../components/VideoOutput.js';
import { ScrollRow } from '../components/ScrollRow.js';
import { HistorySidebar } from '../components/HistorySidebar';
import { toInlineImages, InlineImage } from '../images.js';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../auth/AuthContext';
import { apiFetch, readApiJson } from '../lib/api';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_DURATION_SEC,
  type VideoDurationSec,
} from '../lib/videoFormat';
import { VideoFormatPicker } from '../components/VideoFormatPicker';
import {
  deleteStudioHistoryItem,
  loadStudioHistory,
  newHistoryId,
  titleFromBrief,
  upsertStudioHistory,
  type StudioHistoryItem,
} from '../lib/studioHistory';
import { useNavigate } from 'react-router-dom';
import { PLAN_LABELS } from '../auth/types';
import { SITE_NAME } from '../seo/config';

type LogType = 'info' | 'success' | 'warn' | 'error';
type AppState = 'IDLE' | 'GENERATING_ATMOSPHERE' | 'GENERATING_PROMPT' | 'GENERATING_VIDEO' | 'VIDEO_READY';

interface VideoVersion {
  label: string;          // 'V1', 'V2', ...
  interactionId: string;  // Omni interaction id — chained from for edits
  videoUrl: string;
  prompt: string;         // the cinematic directive (V1) or the edit instructions
}

function presetsToChips(
  rows: Awaited<ReturnType<typeof loadStudioPresets>>
): SuggestionChip[] {
  return rows.map((p) => ({
    id: p.id,
    label: p.label,
    prompt: p.prompt,
    description: p.description,
  }));
}

export function StudioPage() {
  const { user, canGenerate, generationCost, tokens, refreshSession, planId, signOut } = useAuth();
  const navigate = useNavigate();
  const requireSignIn = () => {
    navigate('/signin', { state: { from: 'generate' } });
    return false;
  };
  const [product, setProduct] = useState<MediaSelection | null>(null);
  const [atmosphere, setAtmosphere] = useState<MediaSelection | null>(null);
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [submittedImages, setSubmittedImages] = useState<string[]>([]);
  const [products, setProducts] = useState<SuggestionChip[]>([]);
  const [atmospheres, setAtmospheres] = useState<SuggestionChip[]>([]);

  // "Generate your own atmosphere": a setting the user types instead of picking
  // or uploading an atmosphere image. On submit it's expanded by Flash Lite and
  // rendered by gemini-3.1-flash-lite-image, then fed into the video pipeline as the reference.
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  const [versions, setVersions] = useState<VideoVersion[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const versionCount = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [durationSec, setDurationSec] = useState<VideoDurationSec>(DEFAULT_DURATION_SEC);

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [historyItems, setHistoryItems] = useState<StudioHistoryItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [homeBrief, setHomeBrief] = useState('');
  const [workspaceMode, setWorkspaceMode] = useState<'home' | 'build'>('home');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setHistoryItems(loadStudioHistory(user?.userId));
  }, [user?.userId]);

  useEffect(() => {
    try {
      const brief = sessionStorage.getItem('ps_landing_brief');
      if (brief) {
        sessionStorage.removeItem('ps_landing_brief');
        setHomeBrief(brief);
        setGeneratePrompt(brief);
        setGenerateOpen(true);
        setWorkspaceMode('build');
        const id = newHistoryId();
        setActiveProjectId(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [productRows, atmosphereRows] = await Promise.all([
          loadStudioPresets('product'),
          loadStudioPresets('atmosphere'),
        ]);
        if (cancelled) return;
        setProducts(presetsToChips(productRows));
        setAtmospheres(presetsToChips(atmosphereRows));
      } catch {
        // Presets optional for studio — uploads still work
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [promptOpen, setPromptOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [logs, setLogs] = useState<{ id: string; timestamp: string; message: string; type: LogType; image?: string }[]>([]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
    };
  }, []);

  // Persist history when a project has a ready video
  useEffect(() => {
    if (appState !== 'VIDEO_READY' || versions.length === 0) return;
    const latest = versions[versions.length - 1];
    const id = activeProjectId || newHistoryId();
    if (!activeProjectId) setActiveProjectId(id);
    const title = titleFromBrief(
      homeBrief || latest.prompt || product?.description || 'Product reel',
    );
    const next = upsertStudioHistory(user?.userId, {
      id,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      productDesc: product?.description,
      atmosphereDesc: atmosphere?.description || generatePrompt || undefined,
      lastPrompt: latest.prompt,
      aspectRatio,
      durationSec,
      versionCount: versions.length,
    });
    setHistoryItems(next);
  }, [appState, versions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = (user?.name || 'there').trim().split(/\s+/)[0] || 'there';
  const showHome = workspaceMode === 'home' && appState === 'IDLE' && versions.length === 0;

  const addLog = (message: string, type: LogType = 'info', image?: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString().split('T')[1].substring(0, 12),
      message,
      type,
      image
    }]);
  };

  const describe = (sel: MediaSelection) => sel.description || `${sel.images.length} uploaded image${sel.images.length > 1 ? 's' : ''}`;

  // Typing a setting is an alternative to picking/uploading an atmosphere image.
  const usingGenerate = !atmosphere && generatePrompt.trim().length > 0;
  const hasAtmosphere = !!atmosphere || usingGenerate;

  // Choosing a suggestion or uploading supersedes a typed prompt — clear it so the
  // two paths never both feed submit. Updater-form calls only touch an existing
  // selection (by which point generate is already cleared), so ignore those.
  const selectAtmosphere: React.Dispatch<React.SetStateAction<MediaSelection | null>> = (value) => {
    setAtmosphere(value);
    if (typeof value !== 'function' && value) {
      setGenerateOpen(false);
      setGeneratePrompt('');
    }
  };

  const isGenerating = appState === 'GENERATING_ATMOSPHERE' || appState === 'GENERATING_PROMPT' || appState === 'GENERATING_VIDEO';
  const canSubmit = !!product && hasAtmosphere && !isGenerating;

  // Explains why the submit button is unavailable (shown as a tooltip).
  const submitHint = isGenerating
    ? 'Generating your video — please wait'
    : !product && !hasAtmosphere
    ? 'Add a product image and an atmosphere to start'
    : !product
    ? 'Add a product image to start'
    : !hasAtmosphere
    ? 'Add an atmosphere to start'
    : undefined;

  const selected = versions.find(v => v.label === selectedLabel) ?? null;
  const otherVersions = versions.filter(v => v.label !== selectedLabel);

  const addVersion = (interactionId: string, videoUrl: string, promptText: string) => {
    const label = `V${++versionCount.current}`;
    setVersions(prev => [...prev, { label, interactionId, videoUrl, prompt: promptText }]);
    setSelectedLabel(label);
  };

  const clearPoll = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const resetProject = () => {
    clearPoll();
    setProduct(null);
    setAtmosphere(null);
    setGenerateOpen(false);
    setGeneratePrompt('');
    setVersions([]);
    setSelectedLabel(null);
    versionCount.current = 0;
    setEditOpen(false);
    setEditText('');
    setPromptOpen(false);
    setLogs([]);
    setSubmittedImages([]);
    setAppState('IDLE');
    setHomeBrief('');
    setActiveProjectId(null);
    setWorkspaceMode('home');
  };

  const startFromBrief = () => {
    if (!user) {
      requireSignIn();
      return;
    }
    const brief = homeBrief.trim();
    if (!brief) return;
    const id = newHistoryId();
    setActiveProjectId(id);
    setGenerateOpen(true);
    setGeneratePrompt(brief);
    setWorkspaceMode('build');
    const next = upsertStudioHistory(user.userId, {
      id,
      title: titleFromBrief(brief),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      atmosphereDesc: brief,
      versionCount: 0,
    });
    setHistoryItems(next);
  };

  const onSelectHistory = (item: StudioHistoryItem) => {
    clearPoll();
    setActiveProjectId(item.id);
    setHomeBrief(item.atmosphereDesc || item.title);
    setGeneratePrompt(item.atmosphereDesc || '');
    setGenerateOpen(!!item.atmosphereDesc);
    if (item.aspectRatio) setAspectRatio(item.aspectRatio as typeof DEFAULT_ASPECT_RATIO);
    if (item.durationSec) setDurationSec(item.durationSec as VideoDurationSec);
    setVersions([]);
    setSelectedLabel(null);
    versionCount.current = 0;
    setAppState('IDLE');
    setWorkspaceMode('build');
    setSidebarOpen(false);
  };

  const onDeleteHistory = (id: string) => {
    const next = deleteStudioHistoryItem(user?.userId, id);
    setHistoryItems(next);
    if (activeProjectId === id) resetProject();
  };

  // Polls Omni until the render is ACTIVE, then records the version with an authed blob URL.
  const pollVideoStatus = (fileId: string, interactionId: string, promptText: string, isInitial: boolean) => {
    addLog('Polling Omni for render status...', 'warn');
    clearPoll();
    let lastState = '';

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/file-status/${fileId}`);
        const data = await readApiJson<{ state?: string }>(res);

        if (data.state === 'ACTIVE') {
          clearPoll();
          addLog('Render complete. Stream ready.', 'success');
          try {
            const videoRes = await apiFetch(`/api/video/${fileId}`);
            if (!videoRes.ok) throw new Error(`Video fetch HTTP ${videoRes.status}`);
            const blob = await videoRes.blob();
            const objectUrl = URL.createObjectURL(blob);
            objectUrlsRef.current.push(objectUrl);
            addVersion(interactionId, objectUrl, promptText);
          } catch (fetchErr: any) {
            addLog(`Could not load video: ${fetchErr.message}`, 'error');
            setAppState(isInitial ? 'IDLE' : 'VIDEO_READY');
            void refreshSession();
            return;
          }
          setAppState('VIDEO_READY');
          void refreshSession();
          if (isInitial) {
            // Reset the upload sidebar for the next run.
            setProduct(null);
            setAtmosphere(null);
            setGenerateOpen(false);
            setGeneratePrompt('');
          }
        } else if (data.state === 'FAILED') {
          clearPoll();
          addLog('Omni backend reported FAILED state.', 'error');
          setAppState(isInitial ? 'IDLE' : 'VIDEO_READY');
          void refreshSession();
        } else if (data.state !== lastState) {
          lastState = data.state;
          addLog(`Render status: ${data.state}`);
        }
      } catch (e: any) {
        addLog(`Polling error: ${e.message}`, 'error');
      }
    }, 5000);
  };

  // Initial generation from the sidebar: optionally render an atmosphere image
  // first, then write the prompt and render V1. Server charges tokens.
  const handleSubmit = async () => {
    if (!user) {
      requireSignIn();
      return;
    }
    if (!product || !hasAtmosphere) {
      addLog('Please add a product and an atmosphere.', 'error');
      return;
    }
    if (!canGenerate) {
      addLog(`Out of tokens. Each generation uses ${generationCost} tokens — upgrade your plan.`, 'error');
      navigate('/upgrade', { state: { reason: 'tokens' } });
      return;
    }
    // ERR-143: typed atmosphere + video each charge a full generation.
    const pipelineCost = usingGenerate ? generationCost * 2 : generationCost;
    if (tokens != null && tokens < pipelineCost) {
      addLog(
        usingGenerate
          ? `Need ${pipelineCost} tokens for generate-atmosphere + video (you have ${tokens}).`
          : `Out of tokens. Each generation uses ${generationCost} tokens — upgrade your plan.`,
        'error'
      );
      navigate('/upgrade', { state: { reason: 'tokens' } });
      return;
    }
    const settingInput = generatePrompt.trim();

    if (!activeProjectId) setActiveProjectId(newHistoryId());
    setWorkspaceMode('build');

    versionCount.current = 0;
    setVersions([]);
    setSelectedLabel(null);
    setEditOpen(false);
    setPromptOpen(false);

    try {
      const productImages = await toInlineImages(product.images);
      const productLabel = product.source === 'suggestion' ? product.id : 'product';

      // The atmosphere can come from a selection/upload or be generated on the fly.
      let atmosphereImages: InlineImage[];
      let atmosphereDesc: string;
      let atmosphereSources: string[];   // surfaced later in the "sources" strip

      if (usingGenerate) {
        // Stage 0: Flash Lite writes an image prompt; gemini-3.1-flash-lite-image renders it.
        setAppState('GENERATING_ATMOSPHERE');
        addLog(`Generating atmosphere from: "${settingInput}"`, 'info');
        addLog('Writing image prompt (Gemini Flash Lite)…', 'warn');
        addLog('Rendering atmosphere with gemini-3.1-flash-lite-image…', 'warn');

        const atmoRes = await apiFetch('/api/generate-atmosphere', {
          method: 'POST',
          body: JSON.stringify({ input: settingInput })
        });
        const atmoData = await readApiJson<{
          error?: string;
          image?: { data: string; mimeType: string };
          prompt?: string;
        }>(atmoRes);
        if (!atmoRes.ok) throw new Error(atmoData.error || 'Failed to generate atmosphere');

        const atmoDataUrl = `data:${atmoData.image.mimeType};base64,${atmoData.image.data}`;
        addLog('Atmosphere image ready.', 'success', atmoDataUrl);
        atmosphereImages = [{ data: atmoData.image.data, mimeType: atmoData.image.mimeType }];
        atmosphereDesc = (atmoData.prompt as string) || settingInput;
        atmosphereSources = [atmoDataUrl];
      } else {
        setAppState('GENERATING_PROMPT');
        addLog('Analyzing images...');
        addLog(`Product: ${describe(product)}`, 'info');
        addLog(`Atmosphere: ${describe(atmosphere!)}`, 'info');
        addLog('Encoding images...', 'warn');
        atmosphereImages = await toInlineImages(atmosphere!.images);
        atmosphereDesc = atmosphere!.description.replace(/\{product_id\}/g, productLabel);
        atmosphereSources = atmosphere!.images;
      }

      // Hidden until now: the user first sees a generated atmosphere here.
      setSubmittedImages([...product.images, ...atmosphereSources]);

      setAppState('GENERATING_PROMPT');
      addLog(`Writing ${durationSec}s / ${aspectRatio} prompt…`, 'warn');
      addLog('Requesting Gemini Flash prompt translation...', 'warn');
      const promptRes = await apiFetch('/api/generate-prompt', {
        method: 'POST',
        body: JSON.stringify({
          productDesc: product.description,
          atmosphereDesc,
          productImages,
          atmosphereImages,
          durationSec,
          aspectRatio,
        })
      });
      const promptData = await readApiJson<{ error?: string; prompt?: string }>(promptRes);
      if (!promptRes.ok) throw new Error(promptData.error || 'Failed to generate prompt');

      const generatedPrompt = promptData.prompt as string;
      addLog('Prompt generation complete.', 'success');

      setAppState('GENERATING_VIDEO');
      addLog(`Initializing Omni (${aspectRatio}, ${durationSec}s)…`);
      addLog('Transmitting payloads to Omni...', 'warn');

      const videoRes = await apiFetch('/api/generate-video', {
        method: 'POST',
        body: JSON.stringify({
          prompt: generatedPrompt,
          productImages,
          atmosphereImages,
          durationSec,
          aspectRatio,
        })
      });
      const videoData = await readApiJson<{
        error?: string;
        interactionId?: string;
        fileId?: string;
      }>(videoRes);
      if (!videoRes.ok) throw new Error(videoData.error || 'Failed to start video generation');
      if (!videoData.fileId || !videoData.interactionId) {
        throw new Error('Video started but file/interaction id was missing.');
      }

      addLog(`Interaction created successfully. ID: ${videoData.interactionId}`, 'success');
      pollVideoStatus(videoData.fileId, videoData.interactionId, generatedPrompt, true);
    } catch (e: any) {
      setAppState('IDLE');
      addLog(`Error: ${e.message}`, 'error');
      void refreshSession();
    }
  };

  // Edit the selected version via Omni's stateful chaining → produces a new version.
  const handleEdit = async () => {
    if (!user) {
      requireSignIn();
      return;
    }
    if (!selected || !editText.trim() || isGenerating) return;
    if (!canGenerate) {
      addLog(`Out of tokens. Each generation uses ${generationCost} tokens — upgrade your plan.`, 'error');
      navigate('/upgrade', { state: { reason: 'tokens' } });
      return;
    }
    const instructions = editText.trim();
    const fromLabel = selected.label;
    const fromInteractionId = selected.interactionId;

    setEditOpen(false);
    setEditText('');
    setAppState('GENERATING_VIDEO');
    addLog(`Editing ${fromLabel}: ${instructions}`, 'warn');
    addLog('Transmitting edit to Omni...', 'warn');

    try {
      const res = await apiFetch('/api/edit-video', {
        method: 'POST',
        body: JSON.stringify({ previousInteractionId: fromInteractionId, instructions })
      });
      const data = await readApiJson<{
        error?: string;
        interactionId?: string;
        fileId?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      if (!data.fileId || !data.interactionId) {
        throw new Error('Edit started but file/interaction id was missing.');
      }

      addLog(`Edit interaction created: ${data.interactionId}`, 'success');
      pollVideoStatus(data.fileId, data.interactionId, instructions, false);
    } catch (e: any) {
      setAppState('VIDEO_READY');
      addLog(`Edit failed: ${e.message}`, 'error');
      void refreshSession();
    }
  };

  const selectVersion = (label: string) => {
    setSelectedLabel(label);
    setEditOpen(false);
  };

  // Fetch the video as a blob from within the authenticated app context, then save
  // it from a local object URL. The native player download triggers a navigational
  // request that AI Studio's auth proxy intercepts (returning its cookie-check page
  // instead of the video), so we download it ourselves.
  const downloadVideo = async (version: VideoVersion) => {
    setDownloading(true);
    try {
      let blob: Blob;
      if (version.videoUrl.startsWith('blob:')) {
        const res = await fetch(version.videoUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      } else {
        const res = await apiFetch(version.videoUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni-${version.label.toLowerCase()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      addLog(`Download failed: ${e.message}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="app-shell h-dvh w-full flex overflow-hidden font-sans text-snow">
      <SeoHead page="studio" title="Studio | Product Studio" path="/studio" noindex={!!user} />

      <HistorySidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        items={historyItems}
        activeId={activeProjectId}
        onSelect={onSelectHistory}
        onNew={resetProject}
        onDelete={onDeleteHistory}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top chrome */}
        <header className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 md:px-6 h-14">
          <div className="flex items-center gap-2 min-w-0">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl text-white/50 hover:text-snow hover:bg-white/5 transition-colors md:hidden"
                aria-label="Open history"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={resetProject}
              className="text-base md:text-lg font-extrabold tracking-tight text-snow hover:opacity-90 transition-opacity truncate"
            >
              {SITE_NAME}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border border-white/10 text-white/60 bg-white/5">
                  {PLAN_LABELS[planId]}
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border border-sky-400/30 text-sky-300 bg-sky-500/10">
                  {tokens == null && planId === 'enterprise' ? '∞' : tokens ?? 0} tokens
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-snow hover:bg-white/10 transition-colors"
                  >
                    <span className="max-w-[120px] truncate">{user.name}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#12121a]/95 backdrop-blur-xl shadow-2xl py-1 z-50">
                      <button type="button" className="w-full text-left px-3 py-2.5 text-sm text-fog hover:bg-white/5" onClick={() => { setUserMenuOpen(false); navigate('/upgrade'); }}>Upgrade</button>
                      <button type="button" className="w-full text-left px-3 py-2.5 text-sm text-fog hover:bg-white/5" onClick={() => { setUserMenuOpen(false); void signOut(); navigate('/'); }}>Sign out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/signin', { state: { from: 'generate' } })}
                className="px-4 py-1.5 rounded-full bg-white text-ink text-sm font-semibold hover:bg-fog transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        {showHome ? (
          <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24 relative min-h-0">
            <motion.div
              className="pill-badge mb-8"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <span className="pill-new">New</span>
              <span>AI product video studio</span>
              <span className="text-white/40">→</span>
            </motion.div>

            <motion.p
              className="text-sm font-semibold tracking-[0.2em] uppercase text-sky-300/90 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {SITE_NAME}
            </motion.p>

            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center text-snow max-w-3xl leading-[1.15]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              What should we create, {firstName}?
            </motion.h1>

            <motion.p
              className="mt-4 text-sm md:text-base text-white/45 text-center max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              Describe a scene, then add your product photos in the studio.
            </motion.p>

            <motion.form
              className="command-bar mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              onSubmit={(e) => {
                e.preventDefault();
                startFromBrief();
              }}
            >
              <button
                type="button"
                onClick={() => setWorkspaceMode('build')}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-snow hover:bg-white/8 transition-colors"
                aria-label="Open studio builder"
                title="Add product photos"
              >
                <Plus className="w-5 h-5" />
              </button>
              <input
                value={homeBrief}
                onChange={(e) => setHomeBrief(e.target.value)}
                placeholder="Create a cinematic reel for my product…"
                aria-label="Project brief"
              />
              <span className="hidden sm:inline text-xs font-medium text-white/35 px-2">Plan</span>
              <button
                type="button"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-snow hover:bg-white/8 transition-colors"
                aria-label="Voice input unavailable"
                title="Voice coming soon"
                disabled
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!homeBrief.trim()}
                className="shrink-0 w-10 h-10 rounded-full bg-white text-ink flex items-center justify-center disabled:opacity-30 hover:bg-fog transition-colors"
                aria-label="Start project"
              >
                <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </motion.form>

            <button
              type="button"
              onClick={() => setWorkspaceMode('build')}
              className="mt-6 text-sm text-white/40 hover:text-sky-300 transition-colors"
            >
              Or skip to product & atmosphere studio →
            </button>
          </main>
        ) : (
          <div id="studio-workspace" className="flex-1 flex flex-col md:flex-row md:overflow-hidden min-h-0">
            {/* Builder */}
            <div className="w-full md:w-[420px] lg:w-[460px] md:shrink-0 md:overflow-y-auto p-5 md:p-7 border-b md:border-b-0 md:border-r border-white/8 bg-black/25 backdrop-blur-xl flex flex-col">
              <button
                type="button"
                onClick={() => { if (!isGenerating) setWorkspaceMode('home'); }}
                className="mb-4 text-xs font-medium text-white/40 hover:text-snow transition-colors self-start"
              >
                ← Back to home
              </button>

              <ImageUploader
                title="Product Images"
                type="product"
                suggestions={products}
                selection={product}
                onSelect={setProduct}
                disabled={isGenerating}
              />

              <ImageUploader
                title="Atmospheres"
                type="atmosphere"
                suggestions={atmospheres}
                selection={atmosphere}
                onSelect={selectAtmosphere}
                disabled={isGenerating}
              />

              {/* Typed atmosphere from home brief */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setGenerateOpen((o) => !o)}
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-mist hover:text-snow transition-colors"
                >
                  {generateOpen ? 'Hide' : 'Show'} typed atmosphere
                </button>
                {generateOpen && (
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Describe the scene / atmosphere…"
                    rows={3}
                    className="mt-2 w-full bg-ink/70 border border-line text-fog p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/60 rounded-xl resize-none placeholder-mist/40"
                  />
                )}
              </div>

              <VideoFormatPicker
                aspectRatio={aspectRatio}
                durationSec={durationSec}
                onAspectChange={setAspectRatio}
                onDurationChange={setDurationSec}
                disabled={isGenerating}
              />

              <div title={submitHint} className={submitHint ? 'cursor-not-allowed' : undefined}>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="group inline-flex items-center justify-center px-8 py-4 font-semibold tracking-wide text-ink bg-white hover:bg-fog transition-all duration-200 w-full rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-3 w-5 h-5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      Submit
                      <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output */}
            <div className="w-full md:flex-1 p-5 md:p-8 min-h-[50vh] md:min-h-0 md:overflow-y-auto">
              {otherVersions.length > 0 && (
                <div className="flex gap-3 md:gap-4 mb-8">
                  <div className="flex-none w-12" />
                  <ScrollRow className="flex-1 min-w-0" rowClassName="gap-4" deps={[otherVersions.length]}>
                    {otherVersions.map((v) => (
                      <button key={v.label} onClick={() => selectVersion(v.label)} className="group flex-none text-left">
                        <div className="text-xs font-semibold tracking-wide text-mist group-hover:text-accent mb-1.5 transition-colors">{v.label}</div>
                        <video
                          src={v.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className={`object-cover bg-ink opacity-75 group-hover:opacity-100 transition-all border border-line group-hover:border-accent/40 rounded-lg ${
                            aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '3:4' || aspectRatio === '2:3'
                              ? 'w-28 h-44'
                              : aspectRatio === '1:1'
                                ? 'w-36 h-36'
                                : 'w-40 aspect-video'
                          }`}
                        />
                      </button>
                    ))}
                  </ScrollRow>
                </div>
              )}

              <div className="flex gap-3 md:gap-4">
                <div className="flex-none w-12 pt-1">
                  {appState === 'VIDEO_READY' && selected && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setEditOpen((o) => !o)}
                        className="text-sm font-semibold tracking-wide text-snow text-left hover:text-accent transition-colors"
                      >
                        {selected.label}
                      </button>
                      <button
                        onClick={() => setEditOpen((o) => !o)}
                        className={`text-xs font-medium tracking-wide text-left transition-colors ${editOpen ? 'text-accent' : 'text-mist hover:text-snow'}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => downloadVideo(selected)}
                        disabled={downloading}
                        aria-label={`Download ${selected.label}`}
                        title="Download video"
                        className="w-fit text-mist hover:text-accent transition-colors disabled:opacity-50"
                      >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <VideoOutput
                    appState={appState}
                    videoUrl={selected?.videoUrl ?? null}
                    logs={logs}
                    aspectRatio={aspectRatio}
                  />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {editOpen && appState === 'VIDEO_READY' && selected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 md:gap-4 mt-4">
                      <div className="flex-none w-12" />
                      <div className="flex-1 min-w-0">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder={`Describe your changes to ${selected.label} — e.g. "warmer lighting", "slow orbit"…`}
                          className="w-full bg-panel-elevated/90 border border-line text-fog p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/40 resize-y min-h-[100px] rounded-2xl placeholder:text-mist/50"
                        />
                        <button
                          onClick={handleEdit}
                          disabled={!editText.trim()}
                          className="group mt-3 inline-flex items-center justify-center px-8 py-3 font-semibold tracking-wide text-ink bg-white hover:bg-fog transition-colors rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Submit Edit
                          <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {appState === 'VIDEO_READY' && submittedImages.length > 0 && (
                <div className="flex gap-3 md:gap-4 mt-6">
                  <div className="flex-none w-12" />
                  <ScrollRow className="flex-1 min-w-0" rowClassName="gap-2" deps={[submittedImages.length]}>
                    {submittedImages.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Input ${i + 1}`}
                        className="flex-none w-24 h-16 object-cover bg-panel border border-line rounded-lg"
                      />
                    ))}
                  </ScrollRow>
                </div>
              )}

              {appState === 'VIDEO_READY' && selected?.prompt && (
                <div className="flex gap-3 md:gap-4 mt-5">
                  <div className="flex-none w-12" />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setPromptOpen((o) => !o)}
                      className="flex items-center gap-2 text-sm font-semibold tracking-wide text-snow hover:text-accent transition-colors"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${promptOpen ? 'rotate-90' : ''}`} />
                      Prompt
                    </button>
                    <AnimatePresence initial={false}>
                      {promptOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-3 bg-panel/80 border border-line p-4 text-sm leading-relaxed text-fog whitespace-pre-wrap rounded-2xl">
                            {selected.prompt}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
