// ============================================================
// src/constants/colors.ts
// Paleta de colores "Cyber-Alquimia" – Dark Mode Futurista
// ============================================================

export const COLORS = {
  // ── Fondos ─────────────────────────────────────────────────
  bg: {
    deepBlack: '#0A0A0F',      // Fondo principal – negro grafito profundo
    surface: '#111118',        // Tarjetas y contenedores
    elevated: '#18181F',       // Elementos elevados
    modal: 'rgba(10,10,15,0.92)',
  },

  // ── Neón Turquesa (acento primario) ─────────────────────────
  neon: {
    turquoise: '#00FFD4',      // Brillo primario
    turquoiseDim: '#00CCAA',   // Variante oscurecida
    turquoiseGlow: 'rgba(0,255,212,0.25)',  // Glow/halo
    turquoiseFaint: 'rgba(0,255,212,0.08)', // Fondo sutil
  },

  // ── Dorado (acento secundario) ───────────────────────────────
  gold: {
    primary: '#F5C518',        // Dorado brillante
    dim: '#C9A227',            // Dorado oscurecido
    glow: 'rgba(245,197,24,0.20)',
    faint: 'rgba(245,197,24,0.08)',
  },

  // ── Glassmorphism ────────────────────────────────────────────
  glass: {
    background: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.10)',
    borderNeon: 'rgba(0,255,212,0.30)',
    borderGold: 'rgba(245,197,24,0.30)',
  },

  // ── Textos ───────────────────────────────────────────────────
  text: {
    primary: '#F0F0F5',        // Texto principal
    secondary: '#8A8A9A',      // Texto secundario / placeholders
    muted: '#4A4A5A',          // Texto apagado
    neon: '#00FFD4',           // Texto neón turquesa
    gold: '#F5C518',           // Texto dorado
  },

  // ── Estados ──────────────────────────────────────────────────
  status: {
    success: '#00E676',
    error: '#FF4C4C',
    warning: '#FFB347',
    info: '#00FFD4',
    successGlow: 'rgba(0,230,118,0.20)',
    errorGlow: 'rgba(255,76,76,0.20)',
  },

  // ── Plataformas (colores oficiales) ──────────────────────────
  platforms: {
    tiktok: '#010101',
    tiktokPink: '#FE2C55',
    tiktokCyan: '#25F4EE',
    instagram: '#E1306C',
    instagramGradientStart: '#833AB4',
    instagramGradientEnd: '#F77737',
    youtube: '#FF0000',
    threads: '#FFFFFF',
    facebook: '#1877F2',
  },

  // ── Toggle ────────────────────────────────────────────────────
  toggle: {
    active: '#00FFD4',
    inactive: '#2A2A35',
    thumb: '#FFFFFF',
  },
} as const;

// Gradientes reutilizables
export const GRADIENTS = {
  neonGold: ['#00FFD4', '#F5C518'] as const,
  publishButton: ['#00FFD4', '#00CCAA'] as const,
  darkSurface: ['#111118', '#0A0A0F'] as const,
  glassSurface: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as const,
} as const;
