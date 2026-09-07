import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { PlatformId } from '../../types/platform.types';
import { AccountService } from '../../services/accountService';
import { useAppStore } from '../../store/useAppStore';

const C = {
  bg: '#080C14',
  bgCard: 'rgba(8, 18, 32, 0.92)',
  neon: '#00FFD4',
  neonDim: 'rgba(0,255,212,0.18)',
  neonBorder: 'rgba(0,255,212,0.55)',
  gold: '#F5C518',
  textMuted: '#6B7A90',
  white: '#FFFFFF',
};

interface Props {
  platformId: PlatformId | null;
  onClose: () => void;
}

export function LinkAccountModal({ platformId, onClose }: Props) {
  const { linkAccount } = useAppStore();
  const [loading, setLoading] = useState(false);

  if (!platformId) return null;

  const handleConnect = async () => {
    setLoading(true);
    await AccountService.linkPlatformDemo(platformId);
    linkAccount(platformId);
    setLoading(false);
    onClose();
  };

  const getPlatformName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

  return (
    <Modal visible={!!platformId} transparent animationType="fade">
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Vincular Cuenta</Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Ionicons name="logo-vercel" size={48} color={C.neon} style={styles.icon} />
              <Text style={styles.desc}>
                Estás a punto de conectar tu cuenta de {getPlatformName(platformId)}.
              </Text>
              <Text style={styles.subDesc}>
                (Modo Demo: Autorización simulada para probar el flujo completo)
              </Text>
            </View>

            <TouchableOpacity onPress={handleConnect} disabled={loading} style={styles.btnWrap}>
              <LinearGradient
                colors={[C.neonBorder, 'rgba(0,255,212,0.3)', C.neonBorder]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <View style={styles.btnInner}>
                  {loading ? (
                    <ActivityIndicator color={C.neon} />
                  ) : (
                    <>
                      <Ionicons name="link" size={18} color={C.neon} />
                      <Text style={styles.btnText}>Conectar Cuenta (Demo)</Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(8, 12, 20, 0.7)',
  },
  card: {
    backgroundColor: C.bgCard,
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.neonBorder,
    padding: 20,
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: C.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    marginBottom: 16,
  },
  desc: {
    color: C.white,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  subDesc: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  btnWrap: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  btnGradient: {
    padding: 1.5,
    borderRadius: 6,
  },
  btnInner: {
    backgroundColor: 'rgba(8,18,32,0.95)',
    borderRadius: 5,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
