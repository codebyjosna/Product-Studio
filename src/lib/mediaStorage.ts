import { getSupabase } from './supabase';
import type { MediaAssetRow } from './database.types';

export type UploadBucket = 'product-uploads' | 'atmosphere-uploads' | 'generated-videos';
export type MediaKind = MediaAssetRow['kind'];

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('video/')) return 'mp4';
  return 'jpg';
}

export interface UploadResult {
  bucket: UploadBucket;
  path: string;
  signedUrl: string;
  asset: MediaAssetRow | null;
}

/** Upload a file to the user's folder in a private bucket and record metadata. */
export async function uploadUserMedia(
  bucket: UploadBucket,
  file: File,
  kind: MediaKind
): Promise<UploadResult> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sign in to upload media.');

  const path = `${user.id}/${crypto.randomUUID()}.${extensionFor(file)}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (signError || !signed?.signedUrl) {
    throw new Error(signError?.message || 'Could not create signed URL.');
  }

  const { data: asset, error: metaError } = await supabase
    .from('media_assets')
    .insert({
      user_id: user.id,
      bucket,
      path,
      mime_type: file.type || null,
      kind,
      public_url: signed.signedUrl,
    })
    .select()
    .single();

  if (metaError) {
    // File is already stored — surface soft failure on metadata only
    console.warn('media_assets insert failed:', metaError.message);
  }

  return {
    bucket,
    path,
    signedUrl: signed.signedUrl,
    asset: asset ?? null,
  };
}

export async function createSignedMediaUrl(
  bucket: UploadBucket,
  path: string,
  expiresInSeconds = 60 * 60
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Signed URL failed.');
  return data.signedUrl;
}
