// ============================================================
// src/components/version/WhatsNewModal.tsx
// Modal de Novedades y Registro de Cambios — Alquimia Studio
// Titularidad y Autoría: Israel Montás
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { CHANGELOG_HISTORY, APP_VERSION } from '../../constants/version';
import { CloseCircleSvg } from '../ui/SocialIcons';

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
}

const C = {
  bg: '#040711',
  bgCard: 'rgba(8, 16, 28, 0.98)',
  bgItem: 'rgba(14, 25, 45, 0.65)',
  cyan: '#00FFD4',
  cyanDim: 'rgba(0, 255, 212, 0.12)',
  cyanBorder: 'rgba(0, 255, 212, 0.35)',
  gold: '#F5C518',
  goldDim: 'rgba(245, 197, 24, 0.12)',
  white: '#FFFFFF',
  textSub: '#8EA3BF',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  green: '#00FF7F',
  red: '#FF4757',
};

export function WhatsNewModal({ visible, onClose }: WhatsNewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={s.overlay}>
          <View style={s.card}>
            {/* TechCorners */}
            <View style={s.tlCorner} />
            <View style={s.trCorner} />
            <View style={s.blCorner} />
            <View style={s.brCorner} />

            {/* Cabecera */}
            <View style={s.header}>
              <View style={s.headerTitleWrap}>
                <View style={s.iconWrap}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 2l2.4 7.2h7.6l-6 4.8 2.3 7.2-6.3-4.6-6.3 4.6 2.3-7.2-6-4.8h7.6z"
                      fill={C.gold}
                    />
                  </Svg>
                </View>
                <View>
                  <Text style={s.title}>Novedades de la App</Text>
                  <Text style={s.subtitle}>Evolución continua de Alquimia Studio</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                <CloseCircleSvg size={24} color={C.red} />
              </TouchableOpacity>
            </View>

            {/* Lista de Versiones */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
              <View style={s.versionBanner}>
                <Text style={s.versionBannerTitle}>Versión Actual: v{APP_VERSION}</Text>
                <Text style={s.versionBannerSub}>
                  Tu aplicación se mantiene sincronizada y actualizada automáticamente.
                </Text>
              </View>

              {CHANGELOG_HISTORY.map((item) => (
                <View
                  key={item.version}
                  style={[s.versionCard, item.isCurrent && s.versionCardCurrent]}
                >
                  <View style={s.versionHeaderRow}>
                    <View style={[s.versionPill, item.isCurrent && s.versionPillCurrent]}>
                      <Text style={[s.versionPillText, item.isCurrent && s.versionPillTextCurrent]}>
                        v{item.version}
                      </Text>
                    </View>
                    <Text style={s.versionDate}>{item.date}</Text>
                  </View>

                  <Text style={s.itemTitle}>{item.title}</Text>

                  <View style={s.bulletList}>
                    {item.highlights.map((point, idx) => (
                      <View key={idx} style={s.bulletRow}>
                        <Text style={s.bulletDot}>•</Text>
                        <Text style={s.bulletText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={s.footer}>
              <TouchableOpacity onPress={onClose} style={s.gotItBtn} activeOpacity={0.8}>
                <Text style={s.gotItBtnText}>ENTENDIDO</Text>
              </TouchableOpacity>
              <Text style={s.authorSeal}>Desarrollado y creado por Israel Montás</Text>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 17, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: C.bgCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.cyanBorder,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  tlCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.cyan,
    zIndex: 10,
  },
  trCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: C.cyan,
    zIndex: 10,
  },
  blCorner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.cyan,
    zIndex: 10,
  },
  brCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: C.cyan,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: C.cyan,
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 18,
    gap: 14,
  },
  versionBanner: {
    backgroundColor: 'rgba(0, 255, 212, 0.08)',
    borderWidth: 1,
    borderColor: C.cyanBorder,
    borderRadius: 8,
    padding: 12,
  },
  versionBannerTitle: {
    color: C.cyan,
    fontSize: 13,
    fontWeight: '800',
  },
  versionBannerSub: {
    color: '#D4FAF2',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  versionCard: {
    backgroundColor: '#070C16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  versionCardCurrent: {
    borderColor: 'rgba(0, 255, 212, 0.4)',
    backgroundColor: '#07101E',
  },
  versionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  versionPillCurrent: {
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyan,
  },
  versionPillText: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '800',
  },
  versionPillTextCurrent: {
    color: C.cyan,
  },
  versionDate: {
    color: C.textMuted,
    fontSize: 11,
  },
  itemTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bulletDot: {
    color: C.gold,
    fontSize: 14,
    lineHeight: 16,
  },
  bulletText: {
    color: C.textSub,
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(4, 7, 14, 0.95)',
  },
  gotItBtn: {
    width: '100%',
    backgroundColor: C.cyan,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  gotItBtnText: {
    color: '#040711',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  authorSeal: {
    color: C.gold,
    fontSize: 10,
    fontWeight: '700',
  },
});
