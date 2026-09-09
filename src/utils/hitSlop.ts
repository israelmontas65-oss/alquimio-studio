import type { Insets } from 'react-native';

/**
 * Insets estándar de hitSlop para expandir cualquier elemento táctil pequeño
 * al objetivo mínimo de accesibilidad móvil recomendado de 44x44px,
 * SIN alterar su tamaño ni apariencia visual.
 */
export const HIT_SLOP_44: Insets = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12,
};

/**
 * Insets optimizados para iconos compactos (tamaño visual ~24px)
 */
export const HIT_SLOP_ICON: Insets = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

/**
 * Insets específicos para botones de emojis interactivos (~20-24px)
 */
export const HIT_SLOP_EMOJI: Insets = {
  top: 12,
  bottom: 12,
  left: 10,
  right: 10,
};

/**
 * Insets para switches y controles pequeños (~20-28px de alto)
 */
export const HIT_SLOP_SWITCH: Insets = {
  top: 10,
  bottom: 10,
  left: 8,
  right: 8,
};

/**
 * Calcula dinámicamente el hitSlop exacto necesario para alcanzar 44x44px
 * a partir de las dimensiones visuales reales del componente.
 *
 * @param width Ancho visual en píxeles del elemento
 * @param height Alto visual en píxeles del elemento
 * @returns Objeto Insets con el padding táctil exacto
 */
export function getHitSlopForSize(width: number, height: number): Insets {
  const deltaX = Math.max(0, Math.ceil((44 - width) / 2));
  const deltaY = Math.max(0, Math.ceil((44 - height) / 2));
  return {
    top: deltaY,
    bottom: deltaY,
    left: deltaX,
    right: deltaX,
  };
}
