/**
 * Public presence — the brand Collection + inquiry inbox.
 *
 * The operator features pieces (snapshots) and reviews inquiries here; the
 * public /collection page reads + submits through SECURITY DEFINER RPCs, so the
 * anon role never queries the tables. Degrades to no-ops without Supabase.
 */
import type { SharePayload } from "@/documents/shareLink";
import { supabase } from "./supabase";

export interface CollectionItem {
  id: string;
  project_id: string;
  payload: SharePayload;
  rank: number;
  revoked: boolean;
  created_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string;
  status: string;
  created_at: string;
}

export interface PublicCollection {
  owner_id: string;
  brand: string;
  logo: string;
  items: SharePayload[];
}

export const presenceEnabled = (): boolean => !!supabase;

/** One row per project (id = col_<projectId>) so re-featuring replaces. */
export async function featurePiece(projectId: string, ownerId: string, payload: SharePayload, rank = 0): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from("collection")
    .upsert({ id: `col_${projectId}`, owner_id: ownerId, project_id: projectId, payload, rank, revoked: false });
  if (error) throw error;
}

export async function unfeaturePiece(projectId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("collection").delete().eq("id", `col_${projectId}`);
}

export async function loadFeatured(): Promise<CollectionItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("collection").select("*").order("rank", { ascending: true });
  if (error) return [];
  return (data ?? []) as CollectionItem[];
}

/** Public: the brand + its featured pieces (via the RPC). */
export async function loadPublicCollection(): Promise<PublicCollection | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_collection");
  if (error || !data) return null;
  return data as PublicCollection;
}

/** Public: submit an inquiry against the brand owner. */
export async function submitInquiry(owner: string, name: string, email: string, message: string, source = "Website"): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("submit_inquiry", { owner, name, email, message, source });
  if (error) return false;
  return !!data;
}

export async function loadInquiries(): Promise<Inquiry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Inquiry[];
}

export async function setInquiryStatus(id: string, status: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("inquiries").update({ status }).eq("id", id);
}
