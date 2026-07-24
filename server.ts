import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  getSupabaseAdmin,
  isSupabaseServerConfigured,
  requireAuth,
  type AuthedRequest,
} from './server/supabase';
import {
  confirmRazorpayAndApplyPlan,
  consumeTokensForUser,
  createVerifiedRazorpayOrder,
  refundTokensForUser,
} from './server/billing';
import { getTokensPerGeneration } from './server/pricing';
import {
  normalizeVideoFormat,
  shotCeilingForDuration,
  toOmniAspectRatio,
} from './src/lib/videoFormat';

const ownedFiles = new Map<string, Set<string>>(); // userId -> Gemini fileIds
const ownedInteractions = new Map<string, Set<string>>();

let tokenCostCache: { at: number; cost: number } | null = null;
async function tokenCost(): Promise<number> {
  if (tokenCostCache && Date.now() - tokenCostCache.at < 60_000) return tokenCostCache.cost;
  const cost = await getTokensPerGeneration();
  tokenCostCache = { at: Date.now(), cost };
  return cost;
}

function rememberOwnership(userId: string, fileId: string | null, interactionId?: string | null) {
  if (fileId) {
    if (!ownedFiles.has(userId)) ownedFiles.set(userId, new Set());
    ownedFiles.get(userId)!.add(fileId);
    void (async () => {
      try {
        await getSupabaseAdmin()
          .from('generation_files')
          .upsert({ file_id: fileId, user_id: userId, interaction_id: interactionId ?? null });
      } catch {
        /* ignore ownership persist errors */
      }
    })();
  }
  if (interactionId) {
    if (!ownedInteractions.has(userId)) ownedInteractions.set(userId, new Set());
    ownedInteractions.get(userId)!.add(interactionId);
  }
}

async function userOwnsFile(userId: string, fileId: string): Promise<boolean> {
  if (ownedFiles.get(userId)?.has(fileId)) return true;
  try {
    const { data } = await getSupabaseAdmin()
      .from('generation_files')
      .select('file_id')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      rememberOwnership(userId, fileId, null);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function safeClientError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : fallback;
  if (/insufficient_tokens/i.test(msg)) return 'Insufficient tokens.';
  if (/too many ai requests/i.test(msg) || /rate_limited/i.test(msg)) {
    return 'Too many AI requests. Try again in a minute.';
  }
  return fallback;
}

async function enforceAiRateLimit(userId: string) {
  const { error } = await getSupabaseAdmin().rpc('enforce_ai_rate_limit', {
    p_user_id: userId,
    p_max_per_window: 30,
    p_window_seconds: 60,
  });
  if (error) {
    if (/rate_limited/i.test(error.message)) {
      throw Object.assign(new Error('Too many AI requests. Try again in a minute.'), { status: 429 });
    }
    console.warn('enforce_ai_rate_limit:', error.message);
  }
}

// Load local env files (.env.local takes precedence over .env).
// In AI Studio these vars are injected at runtime, so this is a no-op there.
dotenv.config({ path: ['.env.local', '.env'] });

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    // Video generation/editing runs with background:false, so interactions.create
    // blocks until the render finishes (1–3 min). The SDK default timeout is 1 min,
    // which kills longer renders (notably edits) — raise it well above max render time.
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 300000 }, // 5 minutes
    });
  }
  return aiClient;
}

// Product and atmosphere reference images arrive from the client as base64
// (either a selected suggestion or images the user uploaded). Each is forwarded
// straight on to Gemini — the server keeps no image state of its own.
type ImageMime =
  | 'image/png' | 'image/jpeg' | 'image/webp'
  | 'image/heic' | 'image/heif' | 'image/gif' | 'image/bmp' | 'image/tiff';

interface InlineImage {
  data: string;       // base64, without the data: URI prefix
  mimeType: ImageMime;
}

interface GenerateBody {
  productDesc?: string;
  atmosphereDesc?: string;
  productImages?: InlineImage[];
  atmosphereImages?: InlineImage[];
}

// Turns a tiny setting word/phrase ("jungle", "Mediterranean studio") into one
// ~100-word natural-language image prompt for gemini-3.1-flash-lite-image: a clean, empty,
// on-aesthetic product-environment shot with a clear staging surface.
const ATMOSPHERE_DIRECTOR_SYSTEM_INSTRUCTION = `#Your Role

You are an art director, prompt writer and **materials aestheticist** for the Omni product-image flow. A user types a tiny setting input — often a single word. You don't depict the place; you **translate it into premium materials, palette and light**, and return **one natural-language prompt (~100 words)** for Instant Ramen that yields a minimal, textural product-photography vignette: a gorgeous surface, simple planes, and clean space for a small product. Elite product-photographer's-portfolio quality.

### The rule that governs everything

**Decode, don't depict.** Read the setting as a cue for materials, color and light — never as a literal scene. "Log cabin" is not a room with furniture; it's warm timber, grain and low sun. Strip away architecture, props, furniture and lifestyle. The *material* is the subject.

### Constant quality core (every image)

- **Photo-real product photography only.** Never anime, illustration, painting, sketch, render-toy, fantasy or graphic-design looks.
- **Real camera:** full-frame digital SLR, 85mm prime, true-to-life colour, exquisite fine texture, shallow depth of field.
- **Tight, textural crop:** move in close on a small, beautiful passage of surface. Short-telephoto compression, soft background fall-off. No wide shots, no rooms, no establishing views.
- **Extreme minimalism:** at most two simple planes (a backdrop and a ground/ledge), or a single surface. Generous negative space. Nothing else in frame.
- **Premium always.** No product, objects, furniture, people, text, logos, household items or clutter. No staging objects or podiums.
- **Open foreground, never a "spot".** Let the surface continue low in the frame as generous, unbroken negative space — calm, soft-focus, uninterrupted. Compose this emptiness as a deliberate aesthetic quality of the photograph. **Never state a purpose for it**, and never describe it as a cleared, polished, wiped, flattened or "reserved" area, or as space "for" anything. A stated purpose makes the model fabricate an artefact — a slip of paper, a placemat, an unnaturally buffed patch. Open, natural surface only.
- Portrait orientation (~4:5).

### Material aestheticist layer (derive, don't default)

- Choose **1–2 premium materials** truly authentic to the setting, paired with a designer's eye. "Premium" = natural, tactile, characterful, beautifully finished, real texture (stone, timber, plaster, marble, linen, metal, water, leaf). Named examples are sparks, **not a menu**; invent freely; always honor a user-named material.
- Build **palette and light** from those materials. One palette, one light direction per image.

### Method (run silently)

1. Decode the setting into 1–2 premium materials, a palette, and a light.
2. Compose a minimal two-plane (or single-surface) vignette, framed tight.
3. Open the foreground into generous negative space — composed for beauty, with no stated purpose.
4. Write the ~100-word prompt.
5. Append the fixed suppression line on its own line (see Output contract).

### Examples (decode demos, not lookups)

- **"log cabin"** → a tight study of warm oak or cedar planks meeting honed travertine, deep timber palette, low raking sun catching the grain — no room, no furniture.
- **"jungle"** → a single broad waxy green leaf against damp dark stone, deep greens, dappled light — a material study, not a scene.
- **"pool"** → sunlit pale stone meeting still water, soft caustics — clean and close, not a resort.

### Output contract

Output **only**, in this order:

1. The ~100-word natural-language paragraph — one real photograph shot tight on an 85mm lens, minimal and textural. The paragraph never mentions products, placement or purpose.
2. A line break.
3. This exact line, verbatim, on its own (not counted toward the ~100 words):

No products in shot. No logos. No product plinth.

No title, notes or quotes. The suppression line is the only place the word "product" appears.`;

// gemini-3.1-flash-lite-image with delivery:'inline' returns image bytes in the response, but
// fall back to downloading the File API uri if a uri ever comes back instead.
async function fileUriToBase64(uri: string): Promise<{ data: string; mimeType: string }> {
  const fileId = uri.match(/files\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!fileId) throw new Error('Could not parse file id from image uri');
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${apiKey}`;
  const upstream = await fetch(url);
  if (!upstream.ok) throw new Error(`Failed to download generated image: ${upstream.statusText}`);
  const buffer = Buffer.from(await upstream.arrayBuffer());
  return { data: buffer.toString('base64'), mimeType: 'image/jpeg' };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // Endpoint to generate prompt
  app.post('/api/generate-prompt', requireAuth, async (req: AuthedRequest, res) => {
    try {
      await enforceAiRateLimit(req.authUser!.id);
      const { productDesc, atmosphereDesc, productImages = [], atmosphereImages = [] }: GenerateBody = req.body;
      const { durationSec, aspectRatio } = normalizeVideoFormat(req.body || {});
      const shots = shotCeilingForDuration(durationSec);
      const ai = getAiClient();
      const promptWriterSystemInstruction = `## Role
You are an elite product-film director, editor and Gemini Omni prompt engineer in one box. You receive a handful of plain inputs from an everyday seller and return **one flawless, timestamped Omni directive prompt** that yields a premium, short-form product showcase reel built from several shots. You direct like a luxury commercial and cut like a master editor. Your taste *is* the product: restrained, expensive, clarifying. Never slop, never gimmick, never overclaim.

## Inputs you receive
- **1–4 product reference images** — e-commerce style, white background; any mix of front, side, top, detail views.
- **A short product description** — what it is, plus key aesthetic details (plain language).
- **A simple style brief** — often only a few words (e.g. "white studio", "clinical skincare lab"). May include a camera or shot request.
- **Optional extra notes** — treat any later or added input as an override.
- **Target duration and aspect ratio** — mandatory output constraints from the operator.

## Non-negotiable taste
- Classy, simple, high-end. A tight, deliberate edit where every cut earns its place.
- Forbidden: vulgar, crass, busy, cheap, "AI-looking", frantic over-cutting.
- Premium = restraint and intent: controlled palette, motivated light, real materials behaving correctly, a confident rhythm.

## Format & length
- Honor the **target duration and aspect ratio** supplied in the user message.
- **~${durationSec} seconds total. ${shots.min}–${shots.max} shots.** *You* decide the count for this product — never pad past the ceiling.
- Frame and compose every shot for **${aspectRatio}** (safe margins for social crop). If Omni will deliver a nearby container ratio, still write the edit as if the final framed image is ${aspectRatio}.
- **Each shot = one timestamp.** Beats typically 1–2s; vary deliberately for the chosen duration.
- Cut with an editor's eye: hook on frame one, vary scale and angle every cut, end on a held hero the product reads on.

## Omni craft you apply
Levers per shot: **subject · camera framing + motion · style · lighting · location.** Detail buys control; specify deliberately, never bloat.
- **Reference the images.** Lock identity, geometry, proportions, label and material from *all* views. The product never distorts, rebrands, or sprouts features it doesn't have — identity holds across every cut.
- **Camera repertoire.** Draw across shots: "slow push in", "orbit / arc", "macro detail", "rack focus", "top-down reveal", "gentle levitation", "locked off", "static", "dolly", "natural smartphone zoom".
- **Physics & materials.** Omni reasons about gravity, fluids and light. Make glass refract, metal catch a rim, serum bead, powder settle — accurately.
- **World knowledge.** Don't over-explain. State intent and let Omni reason the rest.

## Hard suppressions (always enforce in the output)
- **No music of any kind.** No score, soundtrack, background music, beat, or musical sting — ever.
- **No voice.** No voiceover, narration, dialogue or vocals.
- **No overlaid graphics.** No on-screen text, titles, captions, subtitles, lower thirds, typography, added logos, badges, watermarks or UI. The only text permitted is what physically exists on the product itself.
- **Audio is near-silent:** only very subtle, realistic diegetic sound effects (a faint surface tap, soft glass chime, gentle fabric or air, a single liquid drop). Often barely there.

## Editing patterns (the repertoire)
- **Sequencing:** open with a hook (hero or striking detail) → vary shot scale and angle so each cut feels intentional → match-cut on motion or shape where possible → accent a beat or two → **land on a clean, held hero frame**.
- **Rhythm:** brisk but never frantic; let the final shot breathe ~0.5s longer.
- **Default arc (adapt, don't obey):** hero wide → macro detail → arc → push-in → held hero.

## Method (run silently, then output)
1. **Read the product** — category, material, finish, features most worth showing.
2. **Translate the brief** into a crafted environment, palette and light. Elevate; never literalise crudely.
3. **Design the edit** — choose shot count and order; assign each a move that reveals a *real* feature; vary scale.
4. **Time it** across ~${durationSec}s with editorial rhythm and a held final beat.
5. **Write the directive prompt** per the contract below.

## Output contract
Output **only** the directive prompt — nothing else. It must begin with the words **"Create a professional product showcase reel"** and read as one clean, paste-ready directive timed to ~${durationSec}s at aspect ${aspectRatio}, with ${shots.min}–${shots.max} shots.

## Guardrails
- Missing input → make the **smallest premium assumption** and fold it silently into the directive.
- The product is the star; the environment and the edit exist only to serve it.
- Never pad the shot count; fewer, better beats beat a crowded cut.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          { text: `Product: ${productDesc || '(no description provided — infer from the reference images)'}\nAtmosphere: ${atmosphereDesc || '(no description provided — infer from the reference images)'}\nTarget duration: ${durationSec} seconds\nTarget aspect ratio: ${aspectRatio}\n\nProduct reference images:` },
          ...productImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
          { text: 'Atmosphere reference images:' },
          ...atmosphereImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
        ],
        config: { systemInstruction: promptWriterSystemInstruction },
      });

      res.json({ prompt: response.text });
    } catch (e: any) {
      console.error('Error generating prompt:', e);
      res.status(500).json({ error: safeClientError(e, 'Failed to generate prompt.') });
    }
  });

  // Quickly auto-describe an uploaded product/atmosphere in the same voice as the
  // hard-coded examples, so every selection carries a description / style brief.
  app.post('/api/describe', requireAuth, async (req: AuthedRequest, res) => {
    try {
      await enforceAiRateLimit(req.authUser!.id);
      const { type, images = [] }: { type?: 'product' | 'atmosphere'; images?: InlineImage[] } = req.body;
      if (images.length === 0) {
        res.status(400).json({ error: 'No images provided' });
        return;
      }
      const ai = getAiClient();

      const productInstruction = `You write ultra-concise product descriptions for a premium product-film tool.
Given product reference image(s), output ONE short description (1–2 sentences, plain language): what the product is, plus its key aesthetic and material details. Match the voice of these examples:
- "An oversized cup holder-friendly mug that comes with the last straw you will ever need."
- "Premium luxury running sneakers. Sculptural modular sole and an upper made out of suede nubuck leather and mesh sculptural panels."
- "A bottle of perfume called 'Nerelle'. The ornate bottle features real stone minerals, sodalite, and malachite."
Output ONLY the description text — no labels, no quotes, no preamble.`;

      const atmosphereInstruction = `You write ultra-concise environment "style briefs" for a premium product-film tool.
Given a reference image of an empty scene or backdrop, output ONE short style brief (1–3 sentences) describing the environment, materials, lighting and mood. Where the product would sit, refer to it as the literal token "the {product_id}" so it can be substituted later. Match the voice of these examples:
- "Minimalist craft luxury. A pristine Carrara marble plinth rests against a soft sage backdrop. Crisp directional sunlight casts soft shadows, creating an earthy yet elevated aesthetic. The {product_id} is seen in perfect detail, conveying texture, calm, and sophisticated gradients."
- "Mediterranean, modern luxury. Warm, porous travertine blocks create a structured geometric podium beneath a brilliant azure sky, presenting the {product_id} perfectly. Soft dappled leaf shadows contrast the sharp architectural lines, evoking a serene, sun-drenched coastal escape."
- "Mediterranean minimalism utilizing a warm sun-drenched, polished plaster corner with a soft rose-tinted floor. Crisp palm frond silhouettes cast dramatic yet serene shadows evoking a premium organic golden-hour mood."
Output ONLY the style brief text — no labels, no quotes, no preamble.`;

      const isAtmosphere = type === 'atmosphere';
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          { text: isAtmosphere ? 'Describe this scene/backdrop as a style brief:' : 'Describe this product:' },
          ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
        ],
        config: {
          systemInstruction: isAtmosphere ? atmosphereInstruction : productInstruction,
          maxOutputTokens: 512,
          temperature: 0.7,
        },
      });

      res.json({ description: (response.text || '').trim() });
    } catch (e: any) {
      console.error('Error describing image:', e);
      res.status(500).json({ error: safeClientError(e, 'Failed to describe image.') });
    }
  });

  // Generate an atmosphere image from a tiny setting input. Two stages:
  //   1. gemini-3.1-flash-lite expands the input into a ~100-word image prompt.
  //   2. gemini-3.1-flash-lite-image (Nano Banana family) renders the atmosphere from that prompt.
  // Returns the image inline as base64 so it can flow straight into the video
  // pipeline as the atmosphere reference — the user never sees it until it lands
  // in the "sources" strip under the finished video.
  app.post('/api/generate-atmosphere', requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    let charged = false;
    try {
      await enforceAiRateLimit(userId);
      const { input }: { input?: string } = req.body;
      if (!input || !input.trim()) {
        res.status(400).json({ error: 'No atmosphere prompt provided' });
        return;
      }
      await consumeTokensForUser(userId, (await tokenCost()));
      charged = true;
      const ai = getAiClient();

      // Stage 1 — interpret the user's setting into an on-aesthetic image prompt.
      const promptResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ text: `Setting: ${input.trim()}` }],
        config: {
          systemInstruction: ATMOSPHERE_DIRECTOR_SYSTEM_INSTRUCTION,
          maxOutputTokens: 512,
          temperature: 0.8,
        },
      });
      const imagePrompt = (promptResponse.text || '').trim();
      if (!imagePrompt) throw new Error('Failed to write an atmosphere prompt');

      // Stage 2 — render the atmosphere with gemini-3.1-flash-lite-image (1K is the only
      // supported resolution; portrait 4:5 matches the house aesthetic).
      const interaction = await ai.interactions.create({
        model: 'gemini-3.1-flash-lite-image',
        input: [{ type: 'text', text: imagePrompt }],
        // gemini-3.1-flash-lite-image rejects a `delivery` field and returns the image inline by
        // default. 1K is the only supported resolution; 4:5 matches the house look.
        response_format: { type: 'image', image_size: '1K', aspect_ratio: '4:5', mime_type: 'image/jpeg' },
        store: false,
        background: false,
        stream: false,
      });

      const image = interaction.output_image;
      let data = image?.data;
      let mimeType: string = image?.mime_type || 'image/jpeg';
      if (!data && image?.uri) ({ data, mimeType } = await fileUriToBase64(image.uri));
      if (!data) throw new Error('gemini-3.1-flash-lite-image returned no image');

      res.json({ image: { data, mimeType }, prompt: imagePrompt });
    } catch (e: any) {
      if (charged) await refundTokensForUser(userId, (await tokenCost()));
      console.error('Error generating atmosphere:', e);
      res.status(500).json({ error: safeClientError(e, 'Failed to generate atmosphere.') });
    }
  });

  // Endpoint to start omni generation
  app.post('/api/generate-video', requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    try {
      await enforceAiRateLimit(userId);
      // ERR-110: soft-check then charge only after Omni returns a URI (no timeout-eaten tokens).
      const cost = await tokenCost();
      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('tokens_remaining, plan_id')
        .eq('id', userId)
        .maybeSingle();
      if (
        profile &&
        !(String(profile.plan_id) === 'enterprise' && profile.tokens_remaining == null) &&
        profile.tokens_remaining != null &&
        Number(profile.tokens_remaining) < cost
      ) {
        res.status(402).json({ error: 'Insufficient tokens.' });
        return;
      }

      const { prompt, productImages = [], atmosphereImages = [] }: GenerateBody & { prompt?: string } = req.body;
      const { durationSec, aspectRatio } = normalizeVideoFormat(req.body || {});
      const omniAspect = toOmniAspectRatio(aspectRatio);
      const ai = getAiClient();

      console.log(`Sending request to Gemini Omni (${productImages.length} product, ${atmosphereImages.length} atmosphere images, ${omniAspect}, ~${durationSec}s)...`);

      const timedPrompt =
        `Output spec: aspect ${aspectRatio} (render container ${omniAspect}), total duration ~${durationSec} seconds.\n\n${prompt || ''}`;

      const interaction = await ai.interactions.create({
        model: 'gemini-omni-flash-preview',
        input: [
            ...productImages.map(img => ({ type: 'image' as const, data: img.data, mime_type: img.mimeType })),
            ...atmosphereImages.map(img => ({ type: 'image' as const, data: img.data, mime_type: img.mimeType })),
            { type: 'text', text: timedPrompt }
        ],
        response_format: { type: 'video', delivery: 'uri', aspect_ratio: omniAspect },
        store: true,
        background: false,
        stream: false
      });

      console.log(`Interaction created: ${interaction.id}`);

      if (!interaction.output_video || !interaction.output_video.uri) {
        throw new Error('No video URI returned from interaction.');
      }

      await consumeTokensForUser(userId, cost);

      const fileIdMatch = interaction.output_video.uri.match(/files\/([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;
      rememberOwnership(userId, fileId, interaction.id);

      res.json({ interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
    } catch (e: any) {
      console.error('Error generating video:', e);
      const status = e?.status || 500;
      res.status(status).json({ error: safeClientError(e, 'Failed to generate video.') });
    }
  });

  // Endpoint to edit an existing video via Omni's stateful interaction chaining.
  // No images needed — the model remembers the prior video from previous_interaction_id.
  app.post('/api/edit-video', requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    try {
      await enforceAiRateLimit(userId);
      const { previousInteractionId, instructions }: { previousInteractionId?: string; instructions?: string } = req.body;
      if (!previousInteractionId || !instructions) {
        res.status(400).json({ error: 'previousInteractionId and instructions are required' });
        return;
      }
      if (!ownedInteractions.get(userId)?.has(previousInteractionId)) {
        const { data: owned } = await getSupabaseAdmin()
          .from('generation_files')
          .select('file_id')
          .eq('user_id', userId)
          .eq('interaction_id', previousInteractionId)
          .limit(1)
          .maybeSingle();
        if (!owned) {
          res.status(403).json({ error: 'You do not own this video interaction.' });
          return;
        }
        rememberOwnership(userId, owned.file_id, previousInteractionId);
      }
      // ERR-110: charge after successful Omni edit
      const cost = await tokenCost();
      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('tokens_remaining, plan_id')
        .eq('id', userId)
        .maybeSingle();
      if (
        profile &&
        !(String(profile.plan_id) === 'enterprise' && profile.tokens_remaining == null) &&
        profile.tokens_remaining != null &&
        Number(profile.tokens_remaining) < cost
      ) {
        res.status(402).json({ error: 'Insufficient tokens.' });
        return;
      }
      const ai = getAiClient();

      console.log(`Editing interaction ${previousInteractionId}...`);
      const interaction = await ai.interactions.create({
        model: 'gemini-omni-flash-preview',
        previous_interaction_id: previousInteractionId,
        input: [{ type: 'text', text: instructions }],
        response_format: { type: 'video', delivery: 'uri' },
        store: true,
        background: false,
        stream: false
      });

      if (!interaction.output_video || !interaction.output_video.uri) {
        throw new Error('No video URI returned from interaction.');
      }

      await consumeTokensForUser(userId, cost);

      const fileIdMatch = interaction.output_video.uri.match(/files\/([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;
      rememberOwnership(userId, fileId, interaction.id);

      res.json({ interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
    } catch (e: any) {
      console.error('Error editing video:', e);
      const status = e?.status || 500;
      res.status(status).json({ error: safeClientError(e, 'Failed to edit video.') });
    }
  });

  // Endpoint to poll file status
  app.get('/api/file-status/:fileId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.authUser!.id;
      if (!(await userOwnsFile(userId, fileId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const ai = getAiClient();
      
      const fInfo = await ai.files.get({ name: `files/${fileId}` });
      const state = (fInfo.state as any)?.name || fInfo.state;
      res.json({ state });
    } catch (e: any) {
      console.error('Error getting file status:', e);
      res.status(500).json({ error: 'Failed to get file status.' });
    }
  });

  // Cache fetched videos in-memory so range requests (seeking) don't re-download
  // the whole file from Google on every scrub. These are short clips.
  const videoCache = new Map<string, Buffer>();

  // Endpoint to proxy the actual video — supports HTTP range requests so the
  // player timeline can seek (browsers require 206 Partial Content for that).
  app.get('/api/video/:fileId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.authUser!.id;
      if (!(await userOwnsFile(userId, fileId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      let buffer = videoCache.get(fileId);
      if (!buffer) {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${apiKey}`;
        const upstream = await fetch(url);
        if (!upstream.ok) {
          return res.status(upstream.status).send(`Failed to fetch video: ${upstream.statusText}`);
        }
        buffer = Buffer.from(await upstream.arrayBuffer());
        if (videoCache.size >= 12) {
          const oldest = videoCache.keys().next().value;
          if (oldest) videoCache.delete(oldest);
        }
        videoCache.set(fileId, buffer);
      }

      const total = buffer.length;
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, no-store');

      const range = req.headers.range;
      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        let start = match && match[1] ? parseInt(match[1], 10) : 0;
        let end = match && match[2] ? parseInt(match[2], 10) : total - 1;
        if (Number.isNaN(start)) start = 0;
        if (Number.isNaN(end) || end >= total) end = total - 1;
        if (start > end || start >= total) {
          res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
          return;
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', end - start + 1);
        res.end(buffer.subarray(start, end + 1));
      } else {
        res.setHeader('Content-Length', total);
        res.end(buffer);
      }
    } catch (e: any) {
      console.error('Error streaming video:', e);
      res.status(500).send('Failed to stream video.');
    }
  });

  // User provided endpoints for gemini-3.1-flash-lite-image and gemini-3.1-flash-lite
  app.post("/api/generate", requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    let charged = false;
    try {
      await consumeTokensForUser(userId, (await tokenCost()));
      charged = true;
      const { prompt } = req.body;
      const ai = getAiClient();
      const textResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: "You are an infinite spatial-knowledge-engine generator. Respond to the user's query by generating AI content in a specific JSON format. The format must contain: 'text' (AI-generated explanatory text detailing the topic. Use markdown if necessary, but keep it brief and impactful. CRITICAL: You MUST wrap 2 to 4 key concepts or interesting terms in your text as markdown links using the exact format `[Search Term](Search Term)`, so users can click them to branch off and explore that topic further!), and 'prompts' (an array of exactly 3 string items containing suggested follow-up questions or sub-topics). Keep text concise and informative.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              prompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["text", "prompts"],
          },
        },
      });

      let rawText = textResponse.text || "{}";
      rawText = rawText.replace(/```(json)?/gi, '').trim();
      const responseData = JSON.parse(rawText);
      res.json(responseData);
    } catch (error: any) {
      if (charged) await refundTokensForUser(userId, (await tokenCost()));
      console.error(error);
      const status = error?.status || 500;
      res.status(status).json({ error: safeClientError(error, 'Failed to generate text content.') });
    }
  });

  app.post("/api/generate-image", requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    let charged = false;
    try {
      await enforceAiRateLimit(userId);
      const { prompt, imageBase64, type } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      await consumeTokensForUser(userId, (await tokenCost()));
      charged = true;
      const ai = getAiClient();

      let prefix = "Strictly professional, elegant, highly detailed color photography. High-resolution, cinematic lighting, realistic vibrant colors, crisp focus. Single cohesive image, no text inside the image, no grid layout, no multiple panels. ";
      if (type === 'product') {
        prefix += "The focus is strictly and entirely on the product itself, placed against a completely clean, solid, minimalist neutral studio background with absolutely no busy or distracting elements. ";
      } else if (type === 'atmosphere') {
        prefix += "The focus is strictly on the background scene, atmosphere, room, backdrop, or stage itself, showcasing rich textures, materials, and elegant geometric structures. There are no foreground products, no subjects, and no people in the scene. ";
      }

      let parts: any[] = [{ text: prefix + prompt }];
      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,([^"]*)$/);
        if (match && match.length === 3) {
          parts.unshift({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts },
        config: {
          imageConfig: { aspectRatio: "4:3" }
        } as any,
      });

      let base64EncodeString = "";
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64EncodeString = part.inlineData.data;
          break;
        }
      }

      if (base64EncodeString) {
        res.json({ imageUrl: `data:image/jpeg;base64,${base64EncodeString}` });
      } else {
        if (charged) await refundTokensForUser(userId, (await tokenCost()));
        res.status(500).json({ error: "No image generated" });
      }
    } catch (error: any) {
      if (charged) await refundTokensForUser(userId, (await tokenCost()));
      console.error("Error generating image:", error);
      const status = error?.status || 500;
      res.status(status).json({ error: safeClientError(error, 'Failed to generate image') });
    }
  });

  // ---- Billing (Supabase profiles) ----
  app.get('/api/billing/me', requireAuth, async (req: AuthedRequest, res) => {
    if (!req.authSession) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    res.json({ session: req.authSession, supabaseConfigured: true });
  });

  app.get('/api/health/supabase', (_req, res) => {
    res.json({ configured: isSupabaseServerConfigured() });
  });

  app.post('/api/billing/apply-plan', requireAuth, async (_req: AuthedRequest, res) => {
    res.status(403).json({
      error:
        'Direct plan upgrades are disabled. Complete checkout; use POST /api/razorpay/confirm-payment after a verified Razorpay payment.',
    });
  });

  app.post('/api/razorpay/confirm-payment', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized.' });
      const result = await confirmRazorpayAndApplyPlan({
        userId,
        planId: String(req.body?.planId || ''),
        billing: String(req.body?.billing || 'monthly'),
        razorpayOrderId: String(req.body?.razorpay_order_id || ''),
        razorpayPaymentId: String(req.body?.razorpay_payment_id || ''),
        razorpaySignature: String(req.body?.razorpay_signature || ''),
        amountLabel: req.body?.amountLabel ? String(req.body.amountLabel) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      console.error('confirm-payment error:', error);
      res.status(error?.status || 500).json({ error: safeClientError(error, 'Failed to confirm payment.') });
    }
  });

  // ---- Razorpay ----
  app.get('/api/razorpay/config', (_req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      return res.status(503).json({ error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID.' });
    }
    res.json({
      keyId,
      currency: process.env.RAZORPAY_CURRENCY || 'INR',
    });
  });

  app.post('/api/razorpay/create-order', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

      const { planId, billing, billingAddress } = req.body as {
        planId?: string;
        billing?: string;
        billingAddress?: {
          name?: string;
          email?: string;
          fullAddress?: string;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
        };
      };

      const country = billingAddress?.country?.trim();
      if (!planId || !country) {
        return res.status(400).json({ error: 'planId and billing country are required.' });
      }

      const order = await createVerifiedRazorpayOrder({
        userId,
        planId,
        billing: billing === 'annual' ? 'annual' : 'monthly',
        country,
        billingAddress,
      });
      res.json(order);
    } catch (error: any) {
      console.error('Razorpay create-order error:', error);
      res.status(error?.status || 500).json({
        error: safeClientError(error, 'Failed to create payment order'),
      });
    }
  });

  // Cap JSON body size for non-upload routes; generation still needs large payloads
  // but 20mb is enough for a few reference images.
  // (limit already set above — keep moderate)

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();