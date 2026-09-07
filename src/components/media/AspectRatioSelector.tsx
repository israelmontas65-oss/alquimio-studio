// ============================================================
// src/components/media/AspectRatioSelector.tsx
// Selector interactivo de relación de aspecto y modo de ajuste
// ============================================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';

const C = {
  bgCard: 'rgba(8, 18, 32, 0.95)',
  neon: '#00FFD4',
  neonBorder: 'rgba(0,255,212,0.5)',
  neonDim: 'rgba(0,255,212,0.12)',
  gold: '#F5C518',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.45)',
  textDim: 'rgba(255,255,255,0.7)',
};

export type AspectRatioType = 'auto' | '9:16' | '1:1' | '4:5' | '16:9';

interface FormatOption {
  id: AspectRatioType;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'auto', label: 'Auto', sub: 'Detectar', icon: 'flash-outline' },
  { id: '9:16', label: '9:16', sub: 'Vertical', icon: 'phone-portrait-outline' },
  { id: '1:1', label: '1:1', sub: 'Cuadrado', icon: 'square-outline' },
  { id: '4:5', label: '4:5', sub: 'Retrato', icon: 'tablet-portrait-outline' },
  { id: '16:9', label: '16:9', sub: 'Horizontal', icon: 'tv-outline' },
];

export function AspectRatioSelector() {
  const { selectedAspectRatio, setSelectedAspectRatio, fitMode, setFitMode, selectedMedia } = useAppStore();

  const isVisualMedia = selectedMedia?.type === 'video' || selectedMedia?.type === 'image';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="crop-outline" size={15} color={C.neon} />
          <Text style={styles.title}>FORMATO Y RELACIÓN DE ASPECTO</Text>
        </View>
        {selectedMedia?.aspectRatio && selectedMedia.aspectRatio !== 'unknown' && (
          <Text style={styles.detectedBadge}>
            Original: {selectedMedia.aspectRatio}
          </Text>
        )}
      </View>

      {/* Chips de relación de aspecto */}
      <View style={styles.chipsRow}>
        {FORMAT_OPTIONS.map((opt) => {
          const isSelected = selectedAspectRatio === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => setSelectedAspectRatio(opt.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={opt.icon}
                size={14}
                color={isSelected ? C.neon : C.textMuted}
              />
              <View style={styles.chipTextWrap}>
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={[styles.chipSub, isSelected && styles.chipSubSelected]}>
                  {opt.sub}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selector de modo de ajuste si es foto/video */}
      {isVisualMedia && (
        <View style={styles.fitModeRow}>
          <Text style={styles.fitModeTitle}>Ajuste:</Text>
          <TouchableOpacity
            style={[styles.fitBtn, fitMode === 'blur' && styles.fitBtnActive]}
            onPress={() => setFitMode('blur')}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={13} color={fitMode === 'blur' ? C.neon : C.textMuted} />
            <Text style={[styles.fitText, fitMode === 'blur' && styles.fitTextActive]}>
              Ajustar con desenfoque
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fitBtn, fitMode === 'crop' && styles.fitBtnActive]}
            onPress={() => setFitMode('crop')}
            activeOpacity={0.7}
          >
            <Ionicons name="contract-outline" size={13} color={fitMode === 'crop' ? C.neon : C.textMuted} />
            <Text style={[styles.fitText, fitMode === 'crop' && styles.fitTextActive]}>
              Recorte centrado
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bgCard,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,255,212,0.2)',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 6,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: C.neon,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detectedBadge: {
    color: C.gold,
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(245,197,24,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(245,197,24,0.3)',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  chip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 7,
    paddingHorizontal: 2,
    gap: 3,
  },
  chipSelected: {
    backgroundColor: 'rgba(0,255,212,0.08)',
    borderColor: C.neonBorder,
  },
  chipTextWrap: {
    alignItems: 'center',
  },
  chipLabel: {
    color: C.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  chipLabelSelected: {
    color: C.neon,
  },
  chipSub: {
    color: C.textMuted,
    fontSize: 8.5,
    textAlign: 'center',
  },
  chipSubSelected: {
    color: '#80FFF0',
  },
  fitModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
  },
  fitModeTitle: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  fitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fitBtnActive: {
    backgroundColor: 'rgba(0,255,212,0.08)',
    borderColor: C.neonBorder,
  },
  fitText: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  fitTextActive: {
    color: C.neon,
  },
});
