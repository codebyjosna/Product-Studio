import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  ATMOSPHERE_DIRECTOR_SYSTEM_INSTRUCTION,
  PROMPT_WRITER_SYSTEM_INSTRUCTION,
} from '../_shared/studioPrompts.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-studio-path, range',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'content-range, accept-ranges, content-length, content-type',
}

type InlineImage = { data: string; mimeType: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function safeClientError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : fallback
  if (/insufficient_tokens/i.test(msg)) return 'Insufficient tokens.'
  return fallback
}

function geminiKey() {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY is not configured on Edge Functions.')
  return key
}

function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key)
}

async function requireUser(req: Request): Promise<{ userId: string; authHeader: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
  return { userId: data.user.id, authHeader }
}

async function tokensPerGeneration(admin: SupabaseClient): Promise<number> {
  const { data } = await admin.from('app_settings').select('value').eq('key', 'app_catalog').maybeSingle()
  const n = Number((data?.value as { tokens_per_generation?: number } | undefined)?.tokens_per_generation)
  return Number.isFinite(n) && n > 0 ? n : 10
}

async function consumeTokens(admin: SupabaseClient, userId: string, cost: number) {
  const { data: row, error: readError } = await admin
    .from('profiles')
    .select('tokens')
    .eq('id', userId)
    .maybeSingle()
  if (readError || !row) throw Object.assign(new Error('Profile not found.'), { status: 404 })
  if (row.tokens == null) return
  if (row.tokens < cost) throw Object.assign(new Error('insufficient_tokens'), { status: 402 })
  const { error } = await admin.from('profiles').update({ tokens: row.tokens - cost }).eq('id', userId)
  if (error) throw Object.assign(new Error(error.message), { status: 500 })
}

async function refundTokens(admin: SupabaseClient, userId: string, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return
  const { data: row } = await admin.from('profiles').select('tokens').eq('id', userId).maybeSingle()
  if (!row || row.tokens == null) return
  await admin.from('profiles').update({ tokens: row.tokens + cost }).eq('id', userId)
}

async function rememberOwnership(
  admin: SupabaseClient,
  userId: string,
  fileId: string | null,
  interactionId?: string | null,
) {
  if (!fileId) return
  await admin.from('generation_files').upsert({
    file_id: fileId,
    user_id: userId,
    interaction_id: interactionId ?? null,
  })
}

async function userOwnsFile(admin: SupabaseClient, userId: string, fileId: string) {
  const { data } = await admin
    .from('generation_files')
    .select('file_id')
    .eq('file_id', fileId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

async function userOwnsInteraction(admin: SupabaseClient, userId: string, interactionId: string) {
  const { data } = await admin
    .from('generation_files')
    .select('file_id')
    .eq('user_id', userId)
    .eq('interaction_id', interactionId)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function fileUriToBase64(uri: string): Promise<{ data: string; mimeType: string }> {
  const fileId = uri.match(/files\/([a-zA-Z0-9_-]+)/)?.[1]
  if (!fileId) throw new Error('Could not parse file id from image uri')
  const url =
    `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${geminiKey()}`
  const upstream = await fetch(url)
  if (!upstream.ok) throw new Error(`Failed to download generated image: ${upstream.statusText}`)
  const buf = new Uint8Array(await upstream.arrayBuffer())
  return { data: bytesToBase64(buf), mimeType: 'image/jpeg' }
}

async function generateContent(opts: {
  model: string
  parts: unknown[]
  systemInstruction?: string
  generationConfig?: Record<string, unknown>
}): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: opts.parts }],
  }
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] }
  }
  if (opts.generationConfig) body.generationConfig = opts.generationConfig

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${geminiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini generateContent failed (${res.status})`)
  }
  const texts: string[] = []
  let imageB64 = ''
  for (const cand of data.candidates || []) {
    for (const part of cand?.content?.parts || []) {
      if (part.text) texts.push(part.text)
      if (part.inlineData?.data) imageB64 = part.inlineData.data
    }
  }
  if (imageB64) return imageB64
  return texts.join('').trim()
}

async function createInteraction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/interactions?key=${geminiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini interactions failed (${res.status})`)
  }
  return data
}

function extractOutputImage(interaction: Record<string, unknown>): { data?: string; mimeType: string; uri?: string } {
  const direct = interaction.output_image as { data?: string; mime_type?: string; uri?: string } | undefined
  if (direct?.data || direct?.uri) {
    return { data: direct.data, mimeType: direct.mime_type || 'image/jpeg', uri: direct.uri }
  }
  const steps = (interaction.steps || []) as Array<{ type?: string; content?: unknown[] }>
  for (const step of steps) {
    if (step.type !== 'model_output') continue
    for (const item of step.content || []) {
      const c = item as { type?: string; data?: string; mime_type?: string; uri?: string }
      if (c.type === 'image') {
        return { data: c.data, mimeType: c.mime_type || 'image/jpeg', uri: c.uri }
      }
    }
  }
  return { mimeType: 'image/jpeg' }
}

function extractVideoUri(interaction: Record<string, unknown>): string | null {
  const direct = interaction.output_video as { uri?: string } | undefined
  if (direct?.uri) return direct.uri
  const steps = (interaction.steps || []) as Array<{ type?: string; content?: unknown[] }>
  for (const step of steps) {
    if (step.type !== 'model_output') continue
    for (const item of step.content || []) {
      const c = item as { type?: string; uri?: string }
      if (c.type === 'video' && c.uri) return c.uri
    }
  }
  return null
}

function fileIdFromUri(uri: string): string | null {
  const m = uri.match(/files\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

function normalizeStudioPath(req: Request): string {
  const header = req.headers.get('x-studio-path')?.trim()
  if (header) return header.startsWith('/') ? header : `/${header}`
  const url = new URL(req.url)
  const q = url.searchParams.get('path')
  if (q) return q.startsWith('/') ? q : `/${q}`
  // /functions/v1/studio-api/api/generate-atmosphere
  const marker = '/studio-api'
  const idx = url.pathname.indexOf(marker)
  if (idx >= 0) {
    const rest = url.pathname.slice(idx + marker.length)
    if (rest && rest !== '/') return rest.startsWith('/') ? rest : `/${rest}`
  }
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const studioPath = normalizeStudioPath(req)
    if (!studioPath) return json({ error: 'Missing x-studio-path' }, 400)

    const { userId } = await requireUser(req)
    const admin = adminClient()

    // ---- Atmosphere ----
    if (req.method === 'POST' && studioPath === '/api/generate-atmosphere') {
      const body = await req.json().catch(() => ({}))
      const input = typeof body.input === 'string' ? body.input.trim() : ''
      if (!input) return json({ error: 'No atmosphere prompt provided' }, 400)

      const imagePrompt = await generateContent({
        model: 'gemini-3.1-flash-lite',
        parts: [{ text: `Setting: ${input}` }],
        systemInstruction: ATMOSPHERE_DIRECTOR_SYSTEM_INSTRUCTION,
        generationConfig: { maxOutputTokens: 512, temperature: 0.8 },
      })
      if (!imagePrompt) throw new Error('Failed to write an atmosphere prompt')

      const interaction = await createInteraction({
        model: 'gemini-3.1-flash-lite-image',
        input: [{ type: 'text', text: imagePrompt }],
        response_format: {
          type: 'image',
          image_size: '1K',
          aspect_ratio: '4:5',
          mime_type: 'image/jpeg',
        },
        store: false,
        background: false,
        stream: false,
      })

      const image = extractOutputImage(interaction)
      let data = image.data
      let mimeType = image.mimeType
      if (!data && image.uri) ({ data, mimeType } = await fileUriToBase64(image.uri))
      if (!data) throw new Error('gemini-3.1-flash-lite-image returned no image')

      return json({ image: { data, mimeType }, prompt: imagePrompt })
    }

    // ---- Prompt ----
    if (req.method === 'POST' && studioPath === '/api/generate-prompt') {
      const body = await req.json().catch(() => ({}))
      const productImages: InlineImage[] = body.productImages || []
      const atmosphereImages: InlineImage[] = body.atmosphereImages || []
      const parts: unknown[] = [
        {
          text:
            `Product: ${body.productDesc || '(no description provided — infer from the reference images)'}\n` +
            `Atmosphere: ${body.atmosphereDesc || '(no description provided — infer from the reference images)'}\n\n` +
            'Product reference images:',
        },
        ...productImages.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
        { text: 'Atmosphere reference images:' },
        ...atmosphereImages.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
      ]
      const prompt = await generateContent({
        model: 'gemini-3.1-flash-lite',
        parts,
        systemInstruction: PROMPT_WRITER_SYSTEM_INSTRUCTION,
      })
      return json({ prompt })
    }

    // ---- Describe ----
    if (req.method === 'POST' && studioPath === '/api/describe') {
      const body = await req.json().catch(() => ({}))
      const images: InlineImage[] = body.images || []
      if (!images.length) return json({ error: 'No images provided' }, 400)
      const isAtmosphere = body.type === 'atmosphere'
      const productInstruction =
        `You write ultra-concise product descriptions for a premium product-film tool.
Given product reference image(s), output ONE short description (1–2 sentences, plain language): what the product is, plus its key aesthetic and material details.
Output ONLY the description text — no labels, no quotes, no preamble.`
      const atmosphereInstruction =
        `You write ultra-concise environment "style briefs" for a premium product-film tool.
Given a reference image of an empty scene or backdrop, output ONE short style brief (1–3 sentences) describing the environment, materials, lighting and mood. Where the product would sit, refer to it as the literal token "the {product_id}" so it can be substituted later.
Output ONLY the style brief text — no labels, no quotes, no preamble.`
      const description = await generateContent({
        model: 'gemini-3.1-flash-lite',
        parts: [
          { text: isAtmosphere ? 'Describe this scene/backdrop as a style brief:' : 'Describe this product:' },
          ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
        ],
        systemInstruction: isAtmosphere ? atmosphereInstruction : productInstruction,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      })
      return json({ description })
    }

    // ---- Generate image (uploader) ----
    if (req.method === 'POST' && studioPath === '/api/generate-image') {
      const body = await req.json().catch(() => ({}))
      if (!body.prompt) return json({ error: 'Prompt is required' }, 400)
      const cost = await tokensPerGeneration(admin)
      let charged = false
      try {
        await consumeTokens(admin, userId, cost)
        charged = true
        let prefix =
          'Strictly professional, elegant, highly detailed color photography. High-resolution, cinematic lighting, realistic vibrant colors, crisp focus. Single cohesive image, no text inside the image, no grid layout, no multiple panels. '
        if (body.type === 'product') {
          prefix +=
            'The focus is strictly and entirely on the product itself, placed against a completely clean, solid, minimalist neutral studio background with absolutely no busy or distracting elements. '
        } else if (body.type === 'atmosphere') {
          prefix +=
            'The focus is strictly on the background scene, atmosphere, room, backdrop, or stage itself, showcasing rich textures, materials, and elegant geometric structures. There are no foreground products, no subjects, and no people in the scene. '
        }
        const parts: unknown[] = [{ text: prefix + body.prompt }]
        if (body.imageBase64) {
          const match = String(body.imageBase64).match(/^data:(image\/[a-zA-Z]*);base64,([^"]*)$/)
          if (match) {
            parts.unshift({ inlineData: { mimeType: match[1], data: match[2] } })
          }
        }
        const imageB64 = await generateContent({
          model: 'gemini-3.1-flash-lite-image',
          parts,
          generationConfig: { imageConfig: { aspectRatio: '4:3' } },
        })
        if (!imageB64) {
          if (charged) await refundTokens(admin, userId, cost)
          return json({ error: 'No image generated' }, 500)
        }
        return json({ imageUrl: `data:image/jpeg;base64,${imageB64}` })
      } catch (e) {
        if (charged) await refundTokens(admin, userId, cost)
        throw e
      }
    }

    // ---- Generate video ----
    if (req.method === 'POST' && studioPath === '/api/generate-video') {
      const body = await req.json().catch(() => ({}))
      const cost = await tokensPerGeneration(admin)
      let charged = false
      try {
        await consumeTokens(admin, userId, cost)
        charged = true
        const productImages: InlineImage[] = body.productImages || []
        const atmosphereImages: InlineImage[] = body.atmosphereImages || []
        const interaction = await createInteraction({
          model: 'gemini-omni-flash-preview',
          input: [
            ...productImages.map((img) => ({ type: 'image', data: img.data, mime_type: img.mimeType })),
            ...atmosphereImages.map((img) => ({ type: 'image', data: img.data, mime_type: img.mimeType })),
            { type: 'text', text: body.prompt },
          ],
          response_format: { type: 'video', delivery: 'uri' },
          store: true,
          background: false,
          stream: false,
        })
        const uri = extractVideoUri(interaction)
        if (!uri) throw new Error('No video URI returned from interaction.')
        const fileId = fileIdFromUri(uri)
        const interactionId = String(interaction.id || '')
        await rememberOwnership(admin, userId, fileId, interactionId)
        return json({ interactionId, uri, fileId })
      } catch (e) {
        if (charged) await refundTokens(admin, userId, cost)
        throw e
      }
    }

    // ---- Edit video ----
    if (req.method === 'POST' && studioPath === '/api/edit-video') {
      const body = await req.json().catch(() => ({}))
      const previousInteractionId = body.previousInteractionId as string | undefined
      const instructions = body.instructions as string | undefined
      if (!previousInteractionId || !instructions) {
        return json({ error: 'previousInteractionId and instructions are required' }, 400)
      }
      if (!(await userOwnsInteraction(admin, userId, previousInteractionId))) {
        return json({ error: 'You do not own this video interaction.' }, 403)
      }
      const cost = await tokensPerGeneration(admin)
      let charged = false
      try {
        await consumeTokens(admin, userId, cost)
        charged = true
        const interaction = await createInteraction({
          model: 'gemini-omni-flash-preview',
          previous_interaction_id: previousInteractionId,
          input: [{ type: 'text', text: instructions }],
          response_format: { type: 'video', delivery: 'uri' },
          store: true,
          background: false,
          stream: false,
        })
        const uri = extractVideoUri(interaction)
        if (!uri) throw new Error('No video URI returned from interaction.')
        const fileId = fileIdFromUri(uri)
        const interactionId = String(interaction.id || '')
        await rememberOwnership(admin, userId, fileId, interactionId)
        return json({ interactionId, uri, fileId })
      } catch (e) {
        if (charged) await refundTokens(admin, userId, cost)
        throw e
      }
    }

    // ---- File status ----
    if (req.method === 'GET' && studioPath.startsWith('/api/file-status/')) {
      const fileId = studioPath.slice('/api/file-status/'.length)
      if (!(await userOwnsFile(admin, userId, fileId))) return json({ error: 'Forbidden' }, 403)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${geminiKey()}`,
      )
      const data = await res.json()
      if (!res.ok) return json({ error: 'Failed to get file status.' }, 500)
      const state = data.state?.name || data.state
      return json({ state })
    }

    // ---- Video proxy ----
    if (req.method === 'GET' && studioPath.startsWith('/api/video/')) {
      const fileId = studioPath.slice('/api/video/'.length)
      if (!(await userOwnsFile(admin, userId, fileId))) return json({ error: 'Forbidden' }, 403)
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${geminiKey()}`,
      )
      if (!upstream.ok) {
        return new Response(`Failed to fetch video: ${upstream.statusText}`, {
          status: upstream.status,
          headers: corsHeaders,
        })
      }
      const buffer = new Uint8Array(await upstream.arrayBuffer())
      const total = buffer.length
      const headers = new Headers(corsHeaders)
      headers.set('Content-Type', 'video/mp4')
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Cache-Control', 'public, max-age=31536000')

      const range = req.headers.get('range')
      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range)
        let start = match && match[1] ? parseInt(match[1], 10) : 0
        let end = match && match[2] ? parseInt(match[2], 10) : total - 1
        if (Number.isNaN(start)) start = 0
        if (Number.isNaN(end) || end >= total) end = total - 1
        if (start > end || start >= total) {
          headers.set('Content-Range', `bytes */${total}`)
          return new Response(null, { status: 416, headers })
        }
        headers.set('Content-Range', `bytes ${start}-${end}/${total}`)
        headers.set('Content-Length', String(end - start + 1))
        return new Response(buffer.subarray(start, end + 1), { status: 206, headers })
      }

      headers.set('Content-Length', String(total))
      return new Response(buffer, { status: 200, headers })
    }

    return json({ error: `Unknown studio path: ${studioPath}` }, 404)
  } catch (e) {
    const status = typeof (e as { status?: number })?.status === 'number'
      ? (e as { status: number }).status
      : 500
    console.error('studio-api error:', e)
    return json({ error: safeClientError(e, 'Studio API request failed.') }, status)
  }
})
