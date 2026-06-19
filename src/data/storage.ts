/**
 * Supabase Storage helpers for project attachments.
 *
 * Uploads go to the `attachments` bucket (public, RLS: owner_id path prefix).
 * All paths follow `{ownerId}/{projectId}/{slot}` — no extension — so upsert
 * always replaces the previous file for that slot.
 *
 * Supabase migration required before this is live:
 *   ALTER TABLE projects ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '{}';
 * And a public bucket named `attachments` must exist in Supabase Storage.
 */
import { supabase } from "./supabase";

const BUCKET = "attachments";

/**
 * Upload a file to a named slot and return its public URL.
 * Uses upsert so the same logical slot always holds one file.
 */
export const uploadAttachment = async (
  file: File,
  ownerId: string,
  projectId: string,
  slot: string,
): Promise<string> => {
  if (!supabase) throw new Error("Supabase is not configured");
  const path = `${ownerId}/${projectId}/${slot}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Remove a stored attachment by its public URL.
 * Silently succeeds when Supabase is not configured or the path cannot be parsed.
 */
export const deleteAttachment = async (url: string): Promise<void> => {
  if (!supabase || !url) return;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  await supabase.storage.from(BUCKET).remove([path]);
};
