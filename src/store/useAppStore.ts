// ============================================================
// src/store/useAppStore.ts
// Store global con Zustand – Estado unificado de la aplicación
// ============================================================

import { create } from 'zustand';
import type { PlatformId, PlatformPublishResult } from '../types/platform.types';
import type { MediaFile } from '../types/media.types';
import type { PublishPayload, PublishSession, PublishSessionStatus } from '../types/publish.types';
import type { PlatformCustomSettings } from '../types/publish.types';
import { PLATFORM_ORDER } from '../constants/platforms';

// ── Estado ────────────────────────────────────────────────────

interface AppState {
  // Medios seleccionados
  selectedMedia: MediaFile | null;
  uploadProgress: number; // 0–100
  selectedAspectRatio: 'auto' | '9:16' | '1:1' | '4:5' | '16:9';
  fitMode: 'blur' | 'crop';

  // Redacción
  caption: string;
  hashtags: string[];

  // Plataformas activas
  activePlatforms: Set<PlatformId>;
  platformSettings: Partial<Record<PlatformId, PlatformCustomSettings>>;

  // Cuentas vinculadas (OAuth / Demo)
  linkedAccounts: Set<PlatformId>;
  platformHandles: Record<PlatformId, string>;
  aiLoading: boolean;

  // Sesión de publicación
  publishSession: PublishSession | null;
  isPublishModalVisible: boolean;
}

// ── Acciones ──────────────────────────────────────────────────

interface AppActions {
  // Medios
  setSelectedMedia: (media: MediaFile | null) => void;
  setUploadProgress: (progress: number) => void;
  setSelectedAspectRatio: (ratio: 'auto' | '9:16' | '1:1' | '4:5' | '16:9') => void;
  setFitMode: (mode: 'blur' | 'crop') => void;

  // Redacción
  setCaption: (caption: string) => void;
  setHashtags: (tags: string[]) => void;
  addHashtag: (tag: string) => void;
  removeHashtag: (tag: string) => void;
  clearHashtags: () => void;

  // Plataformas
  togglePlatform: (id: PlatformId) => void;
  setPlatformActive: (id: PlatformId, active: boolean) => void;
  setPlatformSettings: (id: PlatformId, settings: Partial<PlatformCustomSettings>) => void;

  // IA y Cuentas
  setAiLoading: (loading: boolean) => void;
  setPlatformHandle: (id: PlatformId, handle: string) => void;
  linkAccount: (id: PlatformId, handle?: string) => void;
  unlinkAccount: (id: PlatformId) => void;

  // Publicación
  startPublishSession: (payload: PublishPayload) => void;
  updatePlatformResult: (result: PlatformPublishResult) => void;
  setPublishSessionStatus: (status: PublishSessionStatus) => void;
  showPublishModal: () => void;
  hidePublishModal: () => void;
  resetSession: () => void;
}

// ── Store ─────────────────────────────────────────────────────

const initialActivePlatforms = new Set<PlatformId>(PLATFORM_ORDER);

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  // ── Estado inicial ───────────────────────────────────────────
  selectedMedia: null,
  uploadProgress: 0,
  selectedAspectRatio: 'auto',
  fitMode: 'blur',
  caption: '',
  hashtags: [],
  activePlatforms: new Set<PlatformId>(['tiktok', 'instagram', 'youtube', 'whatsapp', 'facebook']),
  platformSettings: {},
  linkedAccounts: new Set<PlatformId>(),
  platformHandles: {
    tiktok: '',
    instagram: '',
    youtube: '',
    whatsapp: '',
    facebook: '',
  },
  aiLoading: false,
  publishSession: null,
  isPublishModalVisible: false,

  // ── Medios ───────────────────────────────────────────────────
  setSelectedMedia: (media) => set({ selectedMedia: media, uploadProgress: 0 }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setSelectedAspectRatio: (selectedAspectRatio) => set({ selectedAspectRatio }),
  setFitMode: (fitMode) => set({ fitMode }),

  // ── Redacción ────────────────────────────────────────────────
  setCaption: (caption) => set({ caption }),

  setHashtags: (hashtags) => set({ hashtags }),

  addHashtag: (tag) => {
    const cleaned = tag.startsWith('#') ? tag : `#${tag}`;
    const current = get().hashtags;
    if (!current.includes(cleaned)) {
      set({ hashtags: [...current, cleaned] });
    }
  },

  removeHashtag: (tag) =>
    set((state) => ({ hashtags: state.hashtags.filter((t) => t !== tag) })),

  clearHashtags: () => set({ hashtags: [] }),

  // ── Plataformas ──────────────────────────────────────────────
  togglePlatform: (id) =>
    set((state) => {
      const next = new Set(state.activePlatforms);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { activePlatforms: next };
    }),

  setPlatformActive: (id, active) =>
    set((state) => {
      const next = new Set(state.activePlatforms);
      active ? next.add(id) : next.delete(id);
      return { activePlatforms: next };
    }),

  setPlatformSettings: (id, settings) =>
    set((state) => ({
      platformSettings: {
        ...state.platformSettings,
        [id]: { ...state.platformSettings[id], ...settings, platformId: id },
      },
    })),

  // ── IA y Cuentas ─────────────────────────────────────────────
  setAiLoading: (loading) => set({ aiLoading: loading }),
  setPlatformHandle: (id, handle) =>
    set((state) => ({
      platformHandles: { ...state.platformHandles, [id]: handle },
    })),
  linkAccount: (id, handle) =>
    set((state) => {
      const next = new Set(state.linkedAccounts);
      next.add(id);
      // Auto-activate when linked
      const nextActive = new Set(state.activePlatforms);
      nextActive.add(id);
      const cleanHandle = typeof handle === 'string' ? handle.trim() : '';
      const nextHandles = { ...state.platformHandles, [id]: cleanHandle };
      return {
        linkedAccounts: next,
        activePlatforms: nextActive,
        platformHandles: nextHandles,
      };
    }),
  unlinkAccount: (id) =>
    set((state) => {
      const next = new Set(state.linkedAccounts);
      next.delete(id);
      const nextActive = new Set(state.activePlatforms);
      nextActive.delete(id);
      const nextHandles = { ...state.platformHandles, [id]: '' };
      return { linkedAccounts: next, activePlatforms: nextActive, platformHandles: nextHandles };
    }),

  // ── Sesión de publicación ────────────────────────────────────
  startPublishSession: (payload) => {
    const session: PublishSession = {
      id: `session_${Date.now()}`,
      status: 'publishing',
      payload,
      results: payload.activePlatforms.map((platformId) => ({
        platformId,
        status: 'idle',
        progress: 0,
      })),
      startedAt: new Date(),
    };
    set({ publishSession: session });
  },

  updatePlatformResult: (result) =>
    set((state) => {
      if (!state.publishSession) return {};
      const results = state.publishSession.results.map((r) =>
        r.platformId === result.platformId ? { ...r, ...result } : r
      );
      return {
        publishSession: { ...state.publishSession, results },
      };
    }),

  setPublishSessionStatus: (status) =>
    set((state) => {
      if (!state.publishSession) return {};
      return {
        publishSession: {
          ...state.publishSession,
          status,
          completedAt: ['completed', 'partial_error'].includes(status)
            ? new Date()
            : state.publishSession.completedAt,
        },
      };
    }),

  showPublishModal: () => set({ isPublishModalVisible: true }),
  hidePublishModal: () => set({ isPublishModalVisible: false }),

  resetSession: () =>
    set({
      selectedMedia: null,
      uploadProgress: 0,
      selectedAspectRatio: 'auto',
      fitMode: 'blur',
      caption: '',
      hashtags: [],
      publishSession: null,
      isPublishModalVisible: false,
    }),
}));
