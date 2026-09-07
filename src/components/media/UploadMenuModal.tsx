// ============================================================
// src/components/media/UploadMenuModal.tsx
// Menú modal interactivo rápido para selección de medios
// ============================================================

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMediaPicker } from '../../hooks/useMediaPicker';

import { CloudUploadSvg, CloseCircleSvg } from '../ui/SocialIcons';

const C = {
  bgCard: 'rgba(8, 18, 32, 0.98)',
  neon: '#00FFD4',
  neonBorder: 'rgba(0,255,212,0.55)',
  gold: '#F5C518',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.45)',
};

interface UploadMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UploadMenuModal({ visible, onClose }: UploadMenuModalProps) {
  const { pickFromGallery, pickDocument, pickAudio } = useMediaPicker();

  const handleSelect = async (action: () => Promise<any>) => {
    onClose();
    // Leve delay para permitir que el modal se cierre limpiamente antes del intent nativo
    setTimeout(async () => {
      await action();
    }, 150);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Tech Corners */}
            <View style={styles.tlCorner} /><View style={styles.trCorner} />
            <View style={styles.blCorner} /><View style={styles.brCorner} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <CloudUploadSvg size={20} color={C.neon} />
                <Text style={styles.title}>SUBIR Y DISTRIBUIR</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <CloseCircleSvg size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Selecciona el tipo de contenido que deseas cargar y adaptar:
            </Text>

            {/* Opciones */}
            <View style={styles.optionsList}>
              {/* Opción 1: Foto / Video */}
              <TouchableOpacity
                style={styles.optionItem}
                activeOpacity={0.8}
                onPress={() => handleSelect(() => pickFromGallery('both'))}
              >
                <View style={[styles.iconCircle, { borderColor: 'rgba(0,255,212,0.4)' }]}>
                  <Ionicons name="videocam-outline" size={22} color={C.neon} />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>🎬 Foto / Video</Text>
                  <Text style={styles.optionDesc}>
                    Galería del dispositivo (MP4, MOV, JPG, PNG)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.neon} />
              </TouchableOpacity>

              {/* Opción 2: Documento / Plantilla */}
              <TouchableOpacity
                style={styles.optionItem}
                activeOpacity={0.8}
                onPress={() => handleSelect(pickDocument)}
              >
                <View style={[styles.iconCircle, { borderColor: 'rgba(245,197,24,0.4)' }]}>
                  <Ionicons name="document-text-outline" size={22} color={C.gold} />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>📄 Documento / Plantilla</Text>
                  <Text style={styles.optionDesc}>
                    Explorador del sistema (PDF, Word, plantillas, TXT)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.gold} />
              </TouchableOpacity>

              {/* Opción 3: Audio / Sonido */}
              <TouchableOpacity
                style={styles.optionItem}
                activeOpacity={0.8}
                onPress={() => handleSelect(pickAudio)}
              >
                <View style={[styles.iconCircle, { borderColor: 'rgba(0,230,118,0.4)' }]}>
                  <Ionicons name="musical-notes-outline" size={22} color="#00FF7F" />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>🎵 Audio / Sonido</Text>
                  <Text style={styles.optionDesc}>
                    Pistas de sonido y locuciones (MP3, WAV, AAC)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#00FF7F" />
              </TouchableOpacity>
            </View>

            {/* Cancelar */}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const CORNER = 12;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(8,12,20,0.7)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.neonBorder,
    padding: 22,
    position: 'relative',
    gap: 14,
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  tlCorner: { position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: C.neon, borderTopLeftRadius: 14 },
  trCorner: { position: 'absolute', top: 0, right: 0, width: CORNER, height: CORNER, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: C.neon, borderTopRightRadius: 14 },
  blCorner: { position: 'absolute', bottom: 0, left: 0, width: CORNER, height: CORNER, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: C.neon, borderBottomLeftRadius: 14 },
  brCorner: { position: 'absolute', bottom: 0, right: 0, width: CORNER, height: CORNER, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: C.neon, borderBottomRightRadius: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: C.neon,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  optionsList: {
    gap: 10,
    marginTop: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,255,212,0.15)',
    padding: 12,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTexts: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 14,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  cancelText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
