/**
 * Client-portal data access — published dossiers + client approval.
 *
 * The operator publishes a dossier snapshot (a share row) and shares its token
 * link. The public /share page reads the row and submits the client's approval
 * through SECURITY DEFINER RPCs, so the anon role never queries the table.
 * All functions degrade to no-ops/empties when Supabase isn't configured.
 */
import { rid } from "@/domain";
import type { SharePayload } from "@/documents/shareLink";
import { supabase } from "./supabase";

export interface ShareApproval {
  decision: "approved" | "changes";
  signer: string;
  note: string;
  at: string;
}

export interface ShareRecord {
  id: string;
  project_id: string;
  title: string;
  client: string;
  payload: SharePayload;
  approval: ShareApproval | null;
  revoked: boolean;
  created_at: string;
}

export const sharesEnabled = (): boolean => !!supabase;

export const shareUrlFor = (token: string): string => `${window.location.origin}/share?t=${token}`;

/** Publish a dossier snapshot; returns its token. */
export async function publishShare(projectId: string, ownerId: string, payload: SharePayload): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const id = rid("sh");
  const { error } = await supabase.from("shares").insert({
    id,
    owner_id: ownerId,
    project_id: projectId,
    title: payload.piece,
    client: payload.client,
    payload,
  });
  if (error) throw error;
  return id;
}

/** All shares the owner has published for a project, newest first. */
export async function loadProjectShares(projectId: string): Promise<ShareRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shares")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ShareRecord[];
}

export async function revokeShare(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("shares").update({ revoked: true }).eq("id", id);
}

/** Public: load a shared dossier by token (via the SECURITY DEFINER RPC). */
export async function loadSharedDossier(
  token: string,
): Promise<{ payload: SharePayload; approval: ShareApproval | null } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_share", { token });
  if (error || !data) return null;
  return data as { payload: SharePayload; approval: ShareApproval | null };
}

/** Public: submit the client's decision for a shared dossier. */
export async function submitShareApproval(
  token: string,
  decision: "approved" | "changes",
  signer: string,
  note: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("submit_share_approval", { token, decision, signer, note });
  if (error) return false;
  return !!data;
}
