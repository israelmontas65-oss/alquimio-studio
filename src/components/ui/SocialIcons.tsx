// ============================================================
// src/components/ui/SocialIcons.tsx
// Componentes SVG puros con colores oficiales — 100% compatibles
// sin dependencias de fuentes de iconos para evitar cajas [ ]
// ============================================================

import React from 'react';
import Svg, { Path, Rect, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// ── TikTok SVG Oficial (con acentos cian y rojo) ────────────────
export function TikTokSvg({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Acento Rojo / Magenta (#EE1D52) */}
      <Path
        d="M17.8 7.3a4.8 4.8 0 0 1-3.2-3.5V3h-2v11.7a2.8 2.8 0 0 1-3.6 2.7 2.8 2.8 0 0 1-2-3.4 2.8 2.8 0 0 1 2.8-2.1v-2a4.8 4.8 0 0 0-4.8 4.8 4.8 4.8 0 0 0 6.4 4.5 4.8 4.8 0 0 0 3.2-4.5V9.4a6.8 6.8 0 0 0 4-1.2l-.8-.9z"
        fill="#EE1D52"
      />
      {/* Acento Cian (#69C9D0) */}
      <Path
        d="M17.2 6.7a4.8 4.8 0 0 1-3.2-3.5V2.4h-2.4v12a2.8 2.8 0 0 1-3.6 2.7 2.8 2.8 0 0 1-2-3.4 2.8 2.8 0 0 1 2.8-2.1V9.6a4.8 4.8 0 0 0-4.8 4.8 4.8 4.8 0 0 0 6.4 4.5 4.8 4.8 0 0 0 3.2-4.5V8.8a6.8 6.8 0 0 0 4-1.2l-.4-.9z"
        fill="#69C9D0"
      />
      {/* Cuerpo Blanco Central (#FFFFFF) */}
      <Path
        d="M17.5 7a4.8 4.8 0 0 1-3.2-3.5V2.7h-2.2v11.8a2.8 2.8 0 0 1-3.6 2.7 2.8 2.8 0 0 1-2-3.4 2.8 2.8 0 0 1 2.8-2.1v-2a4.8 4.8 0 0 0-4.8 4.8 4.8 4.8 0 0 0 6.4 4.5 4.8 4.8 0 0 0 3.2-4.5V9.1a6.8 6.8 0 0 0 4-1.2l-.6-.9z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// ── Instagram SVG Oficial con Degradado ─────────────────────────
export function InstagramSvg({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FFD521" />
          <Stop offset="35%" stopColor="#F50000" />
          <Stop offset="70%" stopColor="#B900B4" />
          <Stop offset="100%" stopColor="#4A00E0" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#igGrad)" />
      <Rect x="6" y="6" width="12" height="12" rx="3.5" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="15.5" cy="8.5" r="0.9" fill="#FFFFFF" />
    </Svg>
  );
}

// ── YouTube SVG Oficial (Botón Rojo + Play Blanco) ─────────────
export function YouTubeSvg({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="4.5" fill="#FF0000" />
      <Path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#FFFFFF" />
    </Svg>
  );
}

// ── WhatsApp SVG Oficial (Burbuja Verde + Teléfono Blanco) ──────
export function WhatsAppSvg({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#25D366" />
      <Path
        d="M12.04 4C7.65 4 4.08 7.57 4.08 11.96c0 1.48.4 2.92 1.16 4.19L4 20.24l4.22-1.21c1.23.71 2.63 1.09 4.06 1.09 4.39 0 7.96-3.57 7.96-7.96S16.43 4 12.04 4zm4.64 11.23c-.19.53-1.1 1.03-1.52 1.09-.4.06-.9.08-2.61-.63-2.18-.9-3.58-3.13-3.69-3.27-.11-.14-.88-1.17-.88-2.23 0-1.06.56-1.58.76-1.8.2-.22.44-.27.58-.27.15 0 .29 0 .42.01.14.01.32-.05.5.38.19.44.64 1.57.7 1.69.06.11.1.25.02.39-.07.14-.11.22-.22.34-.11.13-.24.28-.34.38-.11.11-.23.23-.1.45.13.22.58.95 1.25 1.54.86.77 1.58 1.01 1.8 1.12.22.11.35.1.48-.05.13-.15.56-.65.71-.88.15-.22.3-.19.5-.11.2.08 1.28.6 1.5.71.22.11.37.17.42.27.06.09.06.56-.13 1.09z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// ── Facebook SVG Oficial ('f' Blanca sobre Azul) ────────────────
export function FacebookSvg({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#1877F2" />
      <Path
        d="M13.5 12h2.2l.35-2.5h-2.55V8.1c0-.7.2-1.2 1.2-1.2h1.3V4.7c-.23-.03-1-.1-1.9-.1-1.9 0-3.2 1.15-3.2 3.3V9.5H8.7V12h2.1v6.5h2.7V12z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// ── Cloud Upload SVG (Nube con flecha hacia arriba) ─────────────
export function CloudUploadSvg({ size = 20, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
        fill={color}
      />
    </Svg>
  );
}

// ── Close Circle SVG (Botón eliminar rojo) ───────────────────────
export function CloseCircleSvg({ size = 20, color = '#FF4C4C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path
        d="M15 9L9 15M9 9L15 15"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Checkmark Circle SVG (Éxito / Conectado) ─────────────────────
export function CheckmarkCircleSvg({ size = 20, color = '#00FF7F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path
        d="M8 12.5L10.5 15L16 9.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Alert Circle SVG (Error / Advertencia) ───────────────────────
export function AlertCircleSvg({ size = 20, color = '#FF5B5B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M12 7V13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="16.5" r="1" fill={color} />
    </Svg>
  );
}

// ── Person Outline SVG (Usuario) ────────────────────────────────
export function PersonOutlineSvg({ size = 18, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Path
        d="M5 21v-2a7 7 0 0 1 14 0v2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Refresh / Switch SVG (Cambiar cuenta) ────────────────────────
export function RefreshSvg({ size = 16, color = '#00F2FE' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

