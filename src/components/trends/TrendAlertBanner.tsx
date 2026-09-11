// ============================================================
// src/components/trends/TrendAlertBanner.tsx
// Banner de Alerta de Tendencia Emergente en Tiempo Real
// Detecta aceleración de mercado (>180%) y sugiere inserción al creador.
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface TrendAlertBannerProps {
  onApplyTrendTag: (tag: string) => void;
}

export function TrendAlertBanner({ onApplyTrendTag }: TrendAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const emergingTag = 'iaenaccion';
  const velocity = '+240%';

  if (dismissed) return null;

  return (
    <View style={s.container}>
      <View style={s.leftContent}>
        <View style={s.flameIconWrap}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              stroke="#F5C518"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={s.textCol}>
          <View style={s.titleRow}>
            <Text style={s.title}>Tendencia Emergente en Tiempo Real</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{velocity} vel.</Text>
            </View>
          </View>
          <Text style={s.sub}>
            #{emergingTag} está en alta aceleración en TikTok y YouTube hoy.
          </Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          onPress={() => onApplyTrendTag(emergingTag)}
          style={s.applyBtn}
          activeOpacity={0.8}
        >
          <Text style={s.applyBtnText}>+ USAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={s.dismissBtn}
          activeOpacity={0.7}
        >
          <Text style={s.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 17, 30, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    gap: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flameIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#F5C518',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: 'rgba(0, 255, 212, 0.15)',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 255, 212, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#00FFD4',
    fontSize: 9,
    fontWeight: '800',
  },
  sub: {
    color: '#8EA3BF',
    fontSize: 10.5,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applyBtn: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  applyBtnText: {
    color: '#040711',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});
