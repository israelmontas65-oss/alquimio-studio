// ============================================================
// src/components/version/AutoUpdateManager.tsx
// Gestor de Actualizaciones Silenciosas e Inteligentes — Alquimia Studio
// Titularidad y Autoría: Israel Montás
// ============================================================

import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Platform, Animated } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { APP_VERSION } from '../../constants/version';
import { saveDraft, restoreDraft, clearDraft } from '../AppUpdateBanner';

const LAST_VERSION_KEY = 'alquimio:last_version_seen';

export function AutoUpdateManager() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { publishSession, aiLoading, caption, hashtags, selectedMedia, setCaption, setHashtags } =
    useAppStore();

  const isPublishing = publishSession?.status === 'publishing';
  const isBusyRef = useRef(false);
  isBusyRef.current = Boolean(isPublishing || aiLoading);

  const pendingReloadRef = useRef<(() => void) | null>(null);

  // 1. Detectar si acabamos de actualizar desde una versión previa y mostrar Toast breve
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const lastSeen = window.localStorage.getItem(LAST_VERSION_KEY);
      if (lastSeen && lastSeen !== APP_VERSION) {
        // Se aplicó una nueva versión silenciosamente
        showUpdateToast(`✨ Actualizado a la versión v${APP_VERSION}`);
        // Restaurar borrador si existía
        const draft = restoreDraft();
        if (draft && draft.caption && !caption) {
          setCaption(draft.caption);
          if (draft.hashtags && draft.hashtags.length > 0) {
            setHashtags(draft.hashtags);
          }
          clearDraft();
        }
      }
      window.localStorage.setItem(LAST_VERSION_KEY, APP_VERSION);
    } catch (e) {
      console.warn('[AutoUpdateManager] Error verificando versión previa:', e);
    }
  }, []);

  // 2. Control del ciclo del Service Worker (Revisión periódica y silenciosa)
  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let checkInterval: any;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Escuchar si hay worker en espera al arrancar
      if (reg.waiting) {
        handleNewWorkerReady(reg.waiting);
      }

      // Escuchar nuevas instalaciones
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            handleNewWorkerReady(newWorker);
          }
        });
      });

      // Verificación periódica cada 20 minutos
      checkInterval = setInterval(() => {
        try {
          reg.update();
        } catch {
          // Silencioso
        }
      }, 20 * 60 * 1000);
    });

    // Verificación cuando el usuario vuelve a enfocar la app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            try {
              reg.update();
            } catch {
              // Silencioso
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // 3. Ejecutar la recarga cuando el usuario NO esté en una tarea crítica
  const handleNewWorkerReady = (worker: ServiceWorker) => {
    const executeApply = () => {
      // Si el usuario está publicando o la IA está generando, aplazar
      if (isBusyRef.current) {
        pendingReloadRef.current = executeApply;
        return;
      }

      // Guardar borrador actual por seguridad
      saveDraft({
        caption: useAppStore.getState().caption,
        hashtags: useAppStore.getState().hashtags,
        mediaUri: useAppStore.getState().selectedMedia?.uri,
        mediaName: useAppStore.getState().selectedMedia?.name,
        mediaType: useAppStore.getState().selectedMedia?.type,
      });

      // Activar nuevo SW
      worker.postMessage({ type: 'SKIP_WAITING' });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      setTimeout(() => {
        if (!refreshing) {
          window.location.reload();
        }
      }, 1000);
    };

    if (isBusyRef.current) {
      pendingReloadRef.current = executeApply;
    } else {
      executeApply();
    }
  };

  // 4. Si había una recarga pendiente y el usuario terminó su publicación
  useEffect(() => {
    if (!isPublishing && !aiLoading && pendingReloadRef.current) {
      const apply = pendingReloadRef.current;
      pendingReloadRef.current = null;
      setTimeout(() => apply(), 1200);
    }
  }, [isPublishing, aiLoading]);

  const showUpdateToast = (msg: string) => {
    setToastMessage(msg);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setToastMessage(null);
      });
    }, 3500);
  };

  if (!toastMessage) return null;

  return (
    <Animated.View style={[s.toastContainer, { opacity: fadeAnim }]}>
      <View style={s.dot} />
      <Text style={s.toastText}>{toastMessage}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 14 : 48,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#07101E',
    borderWidth: 1,
    borderColor: '#00FFD4',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#00FFD4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FFD4',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
