import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';

const DRAFT_STORAGE_KEY = 'alquimio:draft:v1';

export interface SavedDraft {
  caption: string;
  hashtags: string[];
  mediaUri?: string;
  mediaName?: string;
  mediaType?: 'video' | 'image' | 'audio' | 'document';
  timestamp: number;
}

/**
 * Persiste el borrador actual en localStorage/AsyncStorage antes de actualizar
 */
export function saveDraft(draft: Omit<SavedDraft, 'timestamp'>): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const payload: SavedDraft = {
        ...draft,
        timestamp: Date.now(),
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Alquimio: Error al guardar borrador de actualización:', err);
    }
  }
}

/**
 * Recupera el borrador guardado si existe y es válido
 */
export function restoreDraft(): SavedDraft | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed: SavedDraft = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.warn('Alquimio: Error al restaurar borrador previo:', err);
      return null;
    }
  }
  return null;
}

/**
 * Limpia el borrador almacenado una vez recuperado
 */
export function clearDraft(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      console.warn('Alquimio: Error al purgar borrador:', err);
    }
  }
}

/**
 * Banner no invasivo de actualización de PWA.
 * Escucha al Service Worker en espera y ejecuta skipWaiting + reload
 * ÚNICAMENTE tras la confirmación explícita del usuario al pulsar ACTUALIZAR.
 */
export function AppUpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const { caption, hashtags, selectedMedia } = useAppStore();

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Si ya hay un worker esperando activación
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setHasUpdate(true);
      }

      // Escuchar si se detecta un nuevo worker instalándose
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setHasUpdate(true);
          }
        });
      });
    });

    // Escuchar mensajes personalizados de SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
        setHasUpdate(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdateClick = () => {
    // 1. Guardar el borrador en curso bajo la clave versionada
    saveDraft({
      caption,
      hashtags,
      mediaUri: selectedMedia?.uri,
      mediaName: selectedMedia?.name,
      mediaType: selectedMedia?.type,
    });

    // 2. Notificar al Service Worker para activar inmediatamente
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    // 3. Recargar la aplicación al tomar el nuevo controlador
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Fallback de seguridad en caso de demora
    setTimeout(() => {
      if (!refreshing) {
        window.location.reload();
      }
    }, 800);
  };

  if (!hasUpdate) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.dot} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Nueva versión disponible</Text>
          <Text style={styles.subtitle}>
            Actualiza para disfrutar de las últimas mejoras
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={handleUpdateClick}
        style={styles.updateBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.updateBtnText}>ACTUALIZAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090E1A',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF7F',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#8EA3BF',
    fontSize: 11,
    marginTop: 2,
  },
  updateBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
