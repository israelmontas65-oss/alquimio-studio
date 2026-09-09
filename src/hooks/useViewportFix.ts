import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Hook para calcular la altura real de viewport en móviles y exponerla
 * como variable CSS `--vh` (window.innerHeight * 0.01).
 *
 * Sirve como fallback robusto para navegadores móviles donde `100dvh`
 * no se recalcula dinámicamente al abrir el teclado o colapsar barras
 * (WebViews Android antiguos, Samsung Internet, etc.).
 *
 * Compatible para usarse junto a `min-height: 100dvh` sin conflicto:
 * `minHeight: '100dvh'`, respaldado por `calc(var(--vh, 1vh) * 100)`.
 */
export function useViewportFix(): number {
  const [vh, setVh] = useState<number>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.innerHeight * 0.01;
    }
    return 0;
  });

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const updateVh = () => {
      const currentVh = window.innerHeight * 0.01;
      setVh(currentVh);
      document.documentElement.style.setProperty('--vh', `${currentVh}px`);
    };

    // Inicializar inmediatamente
    updateVh();

    window.addEventListener('resize', updateVh);
    window.addEventListener('orientationchange', updateVh);

    return () => {
      window.removeEventListener('resize', updateVh);
      window.removeEventListener('orientationchange', updateVh);
    };
  }, []);

  return vh;
}
