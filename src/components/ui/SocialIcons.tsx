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

// ── Threads SVG Oficial (Símbolo @ Espiral sobre Fondo Oscuro) ─
export function ThreadsSvg({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#101010" />
      <Path
        d="M16.5 11.5c-.1-2.8-2-4.5-4.5-4.5-2.7 0-4.8 2-4.8 4.8 0 2.8 2 4.8 4.8 4.8 1.8 0 3.2-.9 3.8-2.2l-1.4-.8c-.4.9-1.3 1.5-2.4 1.5-1.9 0-3.2-1.4-3.2-3.3s1.3-3.3 3.2-3.3c1.7 0 2.9 1.1 3 2.6h-3.1c-1.3 0-2.2.9-2.2 2.1 0 1.2.9 2 2.1 2 1 0 1.8-.5 2.1-1.3v1.1h1.5v-3.5zm-3.1 1.9c-.5 0-.9-.4-.9-.9 0-.6.4-1 .9-1h1.5c-.1 1.2-.7 1.9-1.5 1.9z"
        fill={color}
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

// ── Shield Check SVG (Seguridad Verificada) ──────────────────────
export function ShieldCheckSvg({ size = 20, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Key SVG (Autenticación / 2FA) ────────────────────────────────
export function KeySvg({ size = 20, color = '#F5C518' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="7.5" cy="15.5" r="4.5" stroke={color} strokeWidth="2" />
      <Path
        d="M11 12l8.5-8.5M16 6.5l2.5 2.5M18.5 4l2.5 2.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Device Mobile SVG (Sesiones Activas) ──────────────────────────
export function DeviceMobileSvg({ size = 20, color = '#00F0FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="5"
        y="2"
        width="14"
        height="20"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <Path d="M12 18h.01" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

// ── Credit Card SVG (PCI DSS / Pagos) ────────────────────────────
export function CreditCardSvg({ size = 20, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path d="M2 10h20" stroke={color} strokeWidth="2" />
      <Path d="M6 15h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// ── Lock Closed SVG (Cifrado / Hash) ─────────────────────────────
export function LockClosedSvg({ size = 20, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Copy SVG (Copiar códigos) ────────────────────────────────────
export function CopySvg({ size = 18, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Time Outline SVG (En cola / espera) ─────────────────────────
export function TimeOutlineSvg({ size = 18, color = '#8EA3BF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Open Outline SVG (Enlace externo) ────────────────────────────
export function OpenOutlineSvg({ size = 14, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Videocam SVG (Foto / Video) ──────────────────────────────────
export function VideocamSvg({ size = 22, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="6"
        width="14"
        height="12"
        rx="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 10l5-3v10l-5-3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Document Text SVG (Documento / Plantilla) ────────────────────
export function DocumentTextSvg({ size = 22, color = '#F5C518' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 13h8M8 17h5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Musical Notes SVG (Audio / Sonido) ───────────────────────────
export function MusicalNotesSvg({ size = 22, color = '#00FF7F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18V5l12-2v13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="6" cy="18" r="3" fill={color} />
      <Circle cx="18" cy="16" r="3" fill={color} />
    </Svg>
  );
}

// ── Chevron Forward SVG (Flecha lateral derecha) ─────────────────
export function ChevronForwardSvg({ size = 16, color = '#00FFD4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
