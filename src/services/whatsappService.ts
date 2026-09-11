// ============================================================
// src/services/whatsappService.ts
// Servicio de integración para WhatsApp (Ruta B - Intent oficial y Cloud API)
// Manejo transparente de estado: action_required con confirmación humana en Intent
// ============================================================

import { Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { PublishPayload } from '../types/publish.types';
import type { PlatformPublishResult } from '../types/platform.types';
import { saveToken, removeToken } from '../auth/tokenManager';
import { useAppStore } from '../store/useAppStore';

const WA_STORAGE_KEY = 'alquimia_whatsapp_number';

export async function getStoredWhatsAppNumber(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(WA_STORAGE_KEY) || '';
      }
    } else {
      const val = await SecureStore.getItemAsync(WA_STORAGE_KEY);
      return val || '';
    }
  } catch {
    // Ignorar si no está disponible
  }
  return '';
}

export async function saveWhatsAppNumber(phoneNumber: string): Promise<void> {
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WA_STORAGE_KEY, cleanNumber);
    }
  } else {
    await SecureStore.setItemAsync(WA_STORAGE_KEY, cleanNumber);
  }

  await saveToken('whatsapp', {
    accessToken: `wa_local_${Date.now()}`,
    displayName: cleanNumber,
  });

  const store = useAppStore.getState();
  store.linkAccount('whatsapp', cleanNumber);
}

export async function disconnectWhatsApp(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(WA_STORAGE_KEY);
    }
  } else {
    await SecureStore.deleteItemAsync(WA_STORAGE_KEY);
  }
  await removeToken('whatsapp');
  const store = useAppStore.getState();
  store.unlinkAccount('whatsapp');
}

export async function publishToWhatsAppIntent(
  payload: PublishPayload,
  onProgress?: (progress: number, status: PlatformPublishResult['status']) => void
): Promise<PlatformPublishResult> {
  onProgress?.(20, 'uploading');

  const storedNumber = await getStoredWhatsAppNumber();
  const fullText = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');
  const encodedText = encodeURIComponent(fullText);

  // Construir URL de Intent de WhatsApp
  let waUrl = '';
  if (storedNumber) {
    const digitsOnly = storedNumber.replace(/\D/g, '');
    waUrl = `https://api.whatsapp.com/send?phone=${digitsOnly}&text=${encodedText}`;
  } else {
    waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  onProgress?.(60, 'processing');

  const supported = await Linking.canOpenURL(waUrl).catch(() => true);
  if (supported) {
    await Linking.openURL(waUrl);
  } else {
    // Fallback web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }
  }

  onProgress?.(100, 'action_required');

  return {
    platformId: 'whatsapp',
    status: 'action_required',
    progress: 100,
    postUrl: waUrl,
    errorMessage: undefined,
  };
}
