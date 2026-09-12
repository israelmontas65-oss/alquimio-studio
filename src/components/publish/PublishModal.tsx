// ============================================================
// src/components/publish/PublishModal.tsx
// Modal de progreso de publicación en bloque
// Manejo honesto de estado y aviso Sandbox
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { PLATFORMS } from '../../constants/platforms';
import type { PlatformPublishResult } from '../../types/platform.types';
import {
  TikTokSvg,
  InstagramSvg,
  YouTubeSvg,
  ThreadsSvg,
  FacebookSvg,
  CloseCircleSvg,
  CheckmarkCircleSvg,
  AlertCircleSvg,
  TimeOutlineSvg,
  OpenOutlineSvg,
} from '../ui/SocialIcons';

const PLATFORM_SVGS: Record<string, React.ComponentType<{ size?: number }>> = {
  tiktok: TikTokSvg,
  instagram: InstagramSvg,
  youtube: YouTubeSvg,
  facebook: FacebookSvg,
  threads: ThreadsSvg,
};

const C = {
  bg: '#080C14',
  bgCard: 'rgba(8, 18, 32, 0.97)',
  neon: '#00FFD4',
  neonDim: 'rgba(0,255,212,0.15)',
  neonBorder: 'rgba(0,255,212,0.55)',
  gold: '#F5C518',
  goldDim: 'rgba(245,197,24,0.12)',
  goldText: '#FFD966',
  textMuted: 'rgba(255,255,255,0.40)',
  white: '#FFFFFF',
  green: '#00FF7F',
  greenDim: 'rgba(0,255,127,0.1)',
  error: '#FF4C4C',
  errorDim: 'rgba(255,76,76,0.1)',
};

// ── Icono de estado SVG Puro ──────────────────────────────────
function StatusIcon({ status }: { status: PlatformPublishResult['status'] }) {
  switch (status) {
    case 'idle':
      return <TimeOutlineSvg size={18} color={C.textMuted} />;
    case 'uploading':
      return <ActivityIndicator size="small" color={C.neon} />;
    case 'processing':
      return <ActivityIndicator size="small" color={C.gold} />;
    case 'success':
      return <CheckmarkCircleSvg size={18} color={C.green} />;
    case 'action_required':
      return <AlertCircleSvg size={18} color={C.gold} />;
    case 'error':
      return <CloseCircleSvg size={18} color={C.error} />;
    default:
      return <TimeOutlineSvg size={18} color={C.textMuted} />;
  }
}

// ── Texto de estado ────────────────────────────────────────────
function statusText(status: PlatformPublishResult['status'], progress: number): string {
  switch (status) {
    case 'idle':
      return 'En cola de sincronización...';
    case 'uploading':
      return `Subiendo archivo multimedia ${progress}%`;
    case 'processing':
      return 'Procesando en servidores oficiales...';
    case 'success':
      return '✅ Publicado y verificado con éxito';
    case 'action_required':
      return '⚠️ Acción requerida en la aplicación oficial';
    case 'error':
      return '❌ Error en la publicación';
    default:
      return 'Procesando...';
  }
}

// ── Fila individual de plataforma ──────────────────────────────
function PlatformProgressRow({ result }: { result: PlatformPublishResult }) {
  const { updatePlatformResult } = useAppStore();
  const pInfo = Object.values(PLATFORMS).find((p: any) => p.id === result.platformId) as any;
  if (!pInfo) return null;

  const isSuccess = result.status === 'success';
  const isActionReq = result.status === 'action_required';
  const isError = result.status === 'error';
  const isActive = result.status === 'uploading' || result.status === 'processing';

  const barColor = isSuccess ? C.green : isActionReq ? C.gold : isError ? C.error : C.neon;
  const rowBg = isSuccess
    ? C.greenDim
    : isActionReq
    ? C.goldDim
    : isError
    ? C.errorDim
    : C.neonDim;

  const SvgIcon = PLATFORM_SVGS[result.platformId];

  return (
    <View style={[row.wrap, { backgroundColor: rowBg }]}>
      {/* Icono Oficial SVG */}
      <View style={[row.icon, { backgroundColor: pInfo.iconColor + '22' }]}>
        {SvgIcon ? <SvgIcon size={20} /> : null}
      </View>

      {/* Contenido */}
      <View style={row.content}>
        <View style={row.topLine}>
          <Text style={row.name}>{pInfo.name}</Text>
          <StatusIcon status={result.status} />
        </View>

        <Text
          style={[
            row.status,
            isSuccess && { color: C.green },
            isActionReq && { color: C.goldText },
            isError && { color: C.error },
            isActive && { color: C.neon },
          ]}
        >
          {statusText(result.status, result.progress)}
        </Text>

        {/* Barra de progreso individual */}
        <View style={row.barBg}>
          <View
            style={[
              row.barFill,
              { width: `${result.progress}%`, backgroundColor: barColor },
            ]}
          />
        </View>

        {/* Enlace de confirmación oficial */}
        {isSuccess && result.postUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(result.postUrl!)}
            style={row.linkBtn}
          >
            <OpenOutlineSvg size={13} color={C.neon} />
            <Text style={row.linkText}>Ver publicación oficial →</Text>
          </TouchableOpacity>
        )}

        {/* Aviso de TikTok Sandbox */}
        {isSuccess && result.isSandbox && (
          <Text style={row.sandboxNotice}>
            🔒 Publicado como privado (Modo Sandbox de TikTok)
          </Text>
        )}

        {/* Botón interactivo: Acción requerida */}
        {isActionReq && (
          <TouchableOpacity
            onPress={() =>
              updatePlatformResult({
                platformId: result.platformId,
                status: 'success',
                progress: 100,
              })
            }
            style={row.actionConfirmBtn}
          >
            <CheckmarkCircleSvg size={14} color={C.green} />
            <Text style={row.actionConfirmText}>Marcar como completado</Text>
          </TouchableOpacity>
        )}

        {/* Mensaje de error */}
        {isError && result.errorMessage && (
          <Text style={row.errorMsg} numberOfLines={2}>
            {result.errorMessage}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Modal principal ────────────────────────────────────────────
export function PublishModal() {
  const { isPublishModalVisible, publishSession, resetSession } = useAppStore();

  if (!isPublishModalVisible || !publishSession) return null;

  const total = publishSession.results.length;
  const avgProgress =
    total === 0
      ? 0
      : publishSession.results.reduce((a, r) => a + r.progress, 0) / total;
  const isDone =
    publishSession.status === 'completed' || publishSession.status === 'partial_error';
  const successCount = publishSession.results.filter(
    (r) => r.status === 'success' || r.status === 'action_required'
  ).length;
  const errorCount = publishSession.results.filter((r) => r.status === 'error').length;

  return (
    <Modal visible={isPublishModalVisible} transparent animationType="slide">
      <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={s.overlay}>
          <View style={s.card}>
            {/* TechCorners */}
            <View style={s.tlCorner} />
            <View style={s.trCorner} />
            <View style={s.blCorner} />
            <View style={s.brCorner} />

            {/* ── Header ── */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Text style={s.title}>ALQUIMIA TRANSMISOR</Text>
                <Text style={s.subtitle}>
                  {isDone
                    ? `${successCount}/${total} redes procesadas`
                    : `Sincronizando ${total} redes en bloque...`}
                </Text>
              </View>
              {isDone && (
                <TouchableOpacity onPress={resetSession} style={s.closeBtn}>
                  <CloseCircleSvg size={22} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Progreso Global ── */}
            <View style={s.globalWrap}>
              <View style={s.globalTop}>
                <Text style={s.globalLabel}>Progreso de Difusión</Text>
                <Text
                  style={[
                    s.globalValue,
                    isDone && successCount === total && { color: C.green },
                    errorCount > 0 && errorCount === total && { color: C.error },
                  ]}
                >
                  {Math.round(avgProgress)}%
                </Text>
              </View>
              <View style={s.globalBarBg}>
                <LinearGradient
                  colors={
                    isDone && errorCount > 0
                      ? [C.errorDim, C.error]
                      : [C.neonDim, C.neon]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.globalBarFill, { width: `${Math.round(avgProgress)}%` }]}
                />
              </View>
            </View>

            {/* ── Lista de plataformas ── */}
            <ScrollView
              style={s.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {publishSession.results.map((r) => (
                <PlatformProgressRow key={r.platformId} result={r} />
              ))}
            </ScrollView>

            {/* ── Botón Finalizar ── */}
            {isDone && (
              <TouchableOpacity
                onPress={resetSession}
                style={s.doneBtn}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[C.neonBorder, 'rgba(0,255,212,0.25)', C.neonBorder]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.doneBtnGradient}
                >
                  <View style={s.doneBtnInner}>
                    <CheckmarkCircleSvg size={18} color={C.neon} />
                    <Text style={s.doneBtnText}>FINALIZAR</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Footer autoría inmutable */}
            <Text style={s.footer}>Alquimia Estudio · Israel Montás · © 2026</Text>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

// ── Estilos filas ──────────────────────────────────────────────
const CORNER = 12;
const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,255,212,0.12)',
    padding: 12,
    gap: 10,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  status: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '500' },
  barBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: '100%', borderRadius: 2 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  linkText: { color: '#00FFD4', fontSize: 11, fontWeight: '600' },
  sandboxNotice: { color: '#FFD966', fontSize: 10.5, marginTop: 3 },
  actionConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,255,127,0.12)',
    borderWidth: 1,
    borderColor: '#00FF7F',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  actionConfirmText: { color: '#00FF7F', fontSize: 11, fontWeight: '700' },
  errorMsg: { color: '#FF8080', fontSize: 11, marginTop: 3 },
});

// ── Estilos modal ──────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,12,20,0.6)',
  },
  card: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: C.neonBorder,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '85%',
    position: 'relative',
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 25,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  tlCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: C.neon,
    borderTopLeftRadius: 20,
  },
  trCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: C.neon,
    borderTopRightRadius: 20,
  },
  blCorner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(0,255,212,0.15)',
  },
  brCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(0,255,212,0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: { flex: 1 },
  title: { color: C.neon, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  subtitle: { color: C.textMuted, fontSize: 12, marginTop: 3, letterSpacing: 0.5 },
  closeBtn: { padding: 2 },
  globalWrap: { marginBottom: 20 },
  globalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  globalLabel: { color: C.white, fontSize: 13, fontWeight: '600' },
  globalValue: { color: C.neon, fontSize: 13, fontWeight: '800' },
  globalBarBg: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  globalBarFill: { height: '100%', borderRadius: 4 },
  list: { marginBottom: 20 },
  doneBtn: { borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  doneBtnGradient: { padding: 1.5, borderRadius: 8 },
  doneBtnInner: {
    backgroundColor: 'rgba(8,18,32,0.96)',
    borderRadius: 7,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneBtnText: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  footer: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 9.5,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
