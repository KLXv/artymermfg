/**
 * Owner's published shares, loaded once and cached so the Deck queue and the
 * co-founder can react to client responses (approvals / change requests).
 */
import { create } from "zustand";
import { loadAllShares, type ShareRecord } from "@/data/shares";

interface SharesStore {
  shares: ShareRecord[];
  load: () => Promise<void>;
}

export const useSharesStore = create<SharesStore>((set) => ({
  shares: [],
  load: async () => set({ shares: await loadAllShares() }),
}));
