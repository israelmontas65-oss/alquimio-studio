// ============================================================
// src/components/trends/TrendRadarModal.tsx
// RADAR DE TENDENCIAS & GUÍA INTELIGENTE PRE-GRABACIÓN
// Alquimia Studio — Sistema de Aprendizaje Continuo en Tiempo Real
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { DistributionOrchestrator } from '../../services/ai/DistributionOrchestrator';
import { ContinuousLearningAgent } from '../../services/ai/ContinuousLearningAgent';
import type { MarketTrendsData, TrendingHashtag, TrendingSoundMeta } from '../../services/ai/types';
import { CloseCircleSvg, CheckmarkCircleSvg } from '../ui/SocialIcons';

interface TrendRadarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectHashtags?: (tags: string[]) => void;
  onSelectTopicTemplate?: (hook: string, bodyTemplate: string) => void;
}

type TabType = 'trends' | 'pre-record' | 'calendar' | 'impact';

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
  greenBg: 'rgba(0, 255, 127, 0.12)',
  red: '#FF4757',
};

export function TrendRadarModal({
  visible,
  onClose,
  onSelectHashtags,
  onSelectTopicTemplate,
}: TrendRadarModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('trends');
  const [loading, setLoading] = useState(false);
  const [marketTrends, setMarketTrends] = useState<MarketTrendsData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Métricas del agente de aprendizaje continuo
  const [learningMetrics, setLearningMetrics] = useState(
    ContinuousLearningAgent.getBeforeAfterMetrics()
  );

  useEffect(() => {
    if (visible) {
      loadTrends();
      setLearningMetrics(ContinuousLearningAgent.getBeforeAfterMetrics());
    }
  }, [visible]);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const data = await DistributionOrchestrator.fetchMarketTrends();
      setMarketTrends(data);
    } catch (e) {
      console.warn('Error cargando tendencias:', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApplyTopTags = () => {
    if (!marketTrends || !marketTrends.hashtags) return;
    const topTags = marketTrends.hashtags.slice(0, 5).map((h) => h.tag.replace('#', ''));
    if (onSelectHashtags) {
      onSelectHashtags(topTags);
      showToast('¡5 hashtags de mercado insertados!');
    }
  };

  const handleSelectTemplate = (hook: string, body: string) => {
    if (onSelectTopicTemplate) {
      onSelectTopicTemplate(hook, body);
      showToast('¡Estructura de video aplicada al editor!');
      setTimeout(() => onClose(), 800);
    }
  };

  const openExternalLink = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={s.overlay}>
          <View style={s.card}>
            {/* TechCorners decorativos */}
            <View style={s.tlCorner} />
            <View style={s.trCorner} />
            <View style={s.blCorner} />
            <View style={s.brCorner} />

            {/* Cabecera */}
            <View style={s.header}>
              <View style={s.headerTitleWrap}>
                <View style={s.radarIconWrap}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="9" stroke={C.cyan} strokeWidth="1.8" />
                    <Circle cx="12" cy="12" r="5" stroke={C.gold} strokeWidth="1.5" />
                    <Path d="M12 3v9l6 3" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" />
                    <Circle cx="12" cy="12" r="1.5" fill={C.gold} />
                  </Svg>
                </View>
                <View>
                  <Text style={s.title}>Radar de Tendencias & IA</Text>
                  <Text style={s.subtitle}>Guía Inteligente en Tiempo Real</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                <CloseCircleSvg size={24} color={C.red} />
              </TouchableOpacity>
            </View>

            {/* Selector de Pestañas */}
            <View style={s.tabBar}>
              <TouchableOpacity
                onPress={() => setActiveTab('trends')}
                style={[s.tabItem, activeTab === 'trends' && s.tabItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTab === 'trends' && s.tabTextActive]}>
                  🚀 En Vivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('pre-record')}
                style={[s.tabItem, activeTab === 'pre-record' && s.tabItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTab === 'pre-record' && s.tabTextActive]}>
                  💡 ¿Qué grabar?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('calendar')}
                style={[s.tabItem, activeTab === 'calendar' && s.tabItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTab === 'calendar' && s.tabTextActive]}>
                  📅 Horarios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('impact')}
                style={[s.tabItem, activeTab === 'impact' && s.tabItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTab === 'impact' && s.tabTextActive]}>
                  📈 Antes/Después
                </Text>
              </TouchableOpacity>
            </View>

            {/* Feedback flotante */}
            {toastMessage && (
              <View style={s.toast}>
                <CheckmarkCircleSvg size={16} color={C.green} />
                <Text style={s.toastText}>{toastMessage}</Text>
              </View>
            )}

            {/* Contenedor desplazable */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
              {loading && !marketTrends ? (
                <View style={s.loadingBox}>
                  <ActivityIndicator size="large" color={C.cyan} />
                  <Text style={s.loadingText}>Escaneando TikTok Creative Center & YouTube Trends...</Text>
                </View>
              ) : null}

              {/* ──────────────── TAB 1: TENDENCIAS EN VIVO ──────────────── */}
              {activeTab === 'trends' && marketTrends && (
                <View style={s.tabBody}>
                  <View style={s.complianceNotice}>
                    <Text style={s.complianceText}>
                      🔒 Cumplimiento estricto: Solo metadatos y patrones analíticos públicos. Cero descarga ni copia de archivos multimedia ajenos.
                    </Text>
                  </View>

                  <View style={s.sectionHeaderRow}>
                    <Text style={s.sectionTitle}>🔥 Hashtags con Mayor Aceleración:</Text>
                    <TouchableOpacity onPress={handleApplyTopTags} style={s.insertTopBtn} activeOpacity={0.8}>
                      <Text style={s.insertTopBtnText}>+ USAR TOP 5</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.hashtagList}>
                    {marketTrends.hashtags.map((h, i) => (
                      <View key={h.tag} style={s.hashtagRow}>
                        <View style={s.tagRankWrap}>
                          <Text style={s.tagRankNumber}>#{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={s.tagHeaderRow}>
                            <Text style={s.tagName}>#{h.tag}</Text>
                            <View style={s.velocityBadge}>
                              <Text style={s.velocityText}>+{h.velocity}% vel.</Text>
                            </View>
                          </View>
                          <Text style={s.tagMeta}>
                            {h.volume} • {h.category}
                          </Text>
                        </View>
                        {onSelectHashtags && (
                          <TouchableOpacity
                            onPress={() => {
                              onSelectHashtags([h.tag]);
                              showToast(`Hashtag #${h.tag} añadido`);
                            }}
                            style={s.singleAddBtn}
                            activeOpacity={0.7}
                          >
                            <Text style={s.singleAddText}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  <Text style={[s.sectionTitle, { marginTop: 12 }]}>
                    🎵 Sonidos Públicos con Mayor Retención (Sound IDs):
                  </Text>
                  {marketTrends.sounds.map((sound) => (
                    <View key={sound.soundId} style={s.soundCard}>
                      <View style={s.soundIconWrap}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M9 18V5l12-2v13"
                            stroke={C.cyan}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Circle cx="6" cy="18" r="3" stroke={C.cyan} strokeWidth="2" />
                          <Circle cx="18" cy="16" r="3" stroke={C.cyan} strokeWidth="2" />
                        </Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.soundTitle} numberOfLines={1}>
                          {sound.title}
                        </Text>
                        <Text style={s.soundMeta}>
                          {sound.author} • Duración recomendada: {sound.recommendedDurationSec} seg
                        </Text>
                        <Text style={s.soundIdTag}>ID: {sound.soundId}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openExternalLink(sound.referenceUrl)}
                        style={s.refBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={s.refBtnText}>Ver en app oficial &rarr;</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* ──────────────── TAB 2: GUÍA PRE-GRABACIÓN ──────────────── */}
              {activeTab === 'pre-record' && (
                <View style={s.tabBody}>
                  <View style={s.guideHeroBanner}>
                    <Text style={s.guideHeroTitle}>🎯 Planificador de Producción Viral</Text>
                    <Text style={s.guideHeroSub}>
                      Usa estas fórmulas comprobadas por el mercado hoy para grabar tu video antes de editarlo.
                    </Text>
                  </View>

                  <View style={s.templateCard}>
                    <View style={s.templateBadgeRow}>
                      <View style={s.categoryBadge}>
                        <Text style={s.categoryBadgeText}>Tutorial / How-To (Retención 92%)</Text>
                      </View>
                      <Text style={s.durationText}>⏱️ 18–26 seg</Text>
                    </View>
                    <Text style={s.hookText}>
                      "El truco de 20 segundos que el 90% de los creadores ignora..."
                    </Text>
                    <Text style={s.structureText}>
                      • Seg 0–3: Pregunta contraria con demostración en pantalla.{'\n'}
                      • Seg 3–15: Los 2 pasos directos sin relleno.{'\n'}
                      • Seg 15–22: El resultado final.{'\n'}
                      • Seg 22–26: CTA: "¿Ya lo conocías? Déjamelo abajo".
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleSelectTemplate(
                          'El truco de 20 segundos que el 90% de los creadores ignora... ⚡',
                          'Paso 1: Configura tu transmisión.\nPaso 2: Activa la automatización en bloque.\n\n¿Ya lo conocías? Déjamelo abajo 👇'
                        )
                      }
                      style={s.useTemplateBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={s.useTemplateBtnText}>USAR ESTA ESTRUCTURA EN EL EDITOR</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.templateCard}>
                    <View style={s.templateBadgeRow}>
                      <View style={[s.categoryBadge, { backgroundColor: 'rgba(245, 197, 24, 0.15)' }]}>
                        <Text style={[s.categoryBadgeText, { color: C.gold }]}>Tecnología & IA (Aceleración +240%)</Text>
                      </View>
                      <Text style={s.durationText}>⏱️ 22–32 seg</Text>
                    </View>
                    <Text style={s.hookText}>
                      "Esta herramienta de IA va a ahorrarte 3 horas hoy mismo..."
                    </Text>
                    <Text style={s.structureText}>
                      • Seg 0–3: Mostrar problema común (pantalla de edición llena).{'\n'}
                      • Seg 3–18: Demostración rápida de la solución.{'\n'}
                      • Seg 18–28: Revelar la herramienta y enlace oficial.{'\n'}
                      • Seg 28–32: CTA: "Guarda este video para no olvidarlo".
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleSelectTemplate(
                          'Esta herramienta de IA va a ahorrarte 3 horas hoy mismo 🚀',
                          'No vuelvas a publicar de forma manual red por red. Con Alquimia Studio distribuyes todo en bloque simultáneamente.\n\nGuarda este Reel para tenerlo a mano 💾'
                        )
                      }
                      style={s.useTemplateBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={s.useTemplateBtnText}>USAR ESTA ESTRUCTURA EN EL EDITOR</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.templateCard}>
                    <View style={s.templateBadgeRow}>
                      <View style={[s.categoryBadge, { backgroundColor: 'rgba(0, 255, 127, 0.15)' }]}>
                        <Text style={[s.categoryBadgeText, { color: C.green }]}>Storytelling / Caso Real (Viralidad 1.8x)</Text>
                      </View>
                      <Text style={s.durationText}>⏱️ 40–55 seg</Text>
                    </View>
                    <Text style={s.hookText}>
                      "Pensé que mi cuenta estaba estancada hasta que cambié esta única regla..."
                    </Text>
                    <Text style={s.structureText}>
                      • Seg 0–4: Confesión de vulnerabilidad o error.{'\n'}
                      • Seg 4–30: La historia de lo que falló y el momento Eureka.{'\n'}
                      • Seg 30–48: El cambio numérico y la lección aplicable.{'\n'}
                      • Seg 48–55: Pregunta de cierre para comentarios.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleSelectTemplate(
                          'Pensé que mi cuenta estaba estancada hasta que cambié esta única regla... 🤫',
                          'Pasé meses subiendo videos a deshora y sin hashtags de aceleración. Cuando sincronicé mi contenido con las ventanas pico del algoritmo, el alcance se multiplicó.\n\n¿A ti qué te ha funcionado mejor? 👇'
                        )
                      }
                      style={s.useTemplateBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={s.useTemplateBtnText}>USAR ESTA ESTRUCTURA EN EL EDITOR</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ──────────────── TAB 3: MODO CALENDARIO ──────────────── */}
              {activeTab === 'calendar' && (
                <View style={s.tabBody}>
                  <View style={s.peakHighlightCard}>
                    <Text style={s.peakHighlightTitle}>🔥 Ventana Pico Recomendada para Hoy:</Text>
                    <Text style={s.peakHighlightTime}>6:15 PM – 9:45 PM</Text>
                    <Text style={s.peakHighlightSub}>
                      Momento de máxima concurrencia en TikTok, Instagram y YouTube Shorts en tu región.
                    </Text>
                  </View>

                  <Text style={s.sectionTitle}>Horarios Óptimos por Plataforma:</Text>

                  <View style={s.scheduleItem}>
                    <View style={s.scheduleHeader}>
                      <Text style={s.platformName}>TikTok</Text>
                      <Text style={s.windowTag}>6:00 PM – 10:00 PM</Text>
                    </View>
                    <View style={s.hoursPillRow}>
                      <View style={s.hourPill}><Text style={s.hourPillText}>12:30 PM</Text></View>
                      <View style={[s.hourPill, s.hourPillActive]}><Text style={s.hourPillTextActive}>6:15 PM ★</Text></View>
                      <View style={s.hourPill}><Text style={s.hourPillText}>9:45 PM</Text></View>
                    </View>
                    <Text style={s.daysText}>Mejores días: Martes, Jueves, Viernes, Domingo</Text>
                  </View>

                  <View style={s.scheduleItem}>
                    <View style={s.scheduleHeader}>
                      <Text style={s.platformName}>Instagram Reels</Text>
                      <Text style={s.windowTag}>7:30 PM – 9:30 PM</Text>
                    </View>
                    <View style={s.hoursPillRow}>
                      <View style={s.hourPill}><Text style={s.hourPillText}>11:00 AM</Text></View>
                      <View style={s.hourPill}><Text style={s.hourPillText}>3:30 PM</Text></View>
                      <View style={[s.hourPill, s.hourPillActive]}><Text style={s.hourPillTextActive}>8:00 PM ★</Text></View>
                    </View>
                    <Text style={s.daysText}>Mejores días: Miércoles, Viernes, Sábado</Text>
                  </View>

                  <View style={s.scheduleItem}>
                    <View style={s.scheduleHeader}>
                      <Text style={s.platformName}>YouTube Shorts</Text>
                      <Text style={s.windowTag}>3:00 PM – 8:00 PM</Text>
                    </View>
                    <View style={s.hoursPillRow}>
                      <View style={s.hourPill}><Text style={s.hourPillText}>2:00 PM</Text></View>
                      <View style={[s.hourPill, s.hourPillActive]}><Text style={s.hourPillTextActive}>5:00 PM ★</Text></View>
                      <View style={s.hourPill}><Text style={s.hourPillText}>7:30 PM</Text></View>
                    </View>
                    <Text style={s.daysText}>Mejores días: Jueves, Viernes, Sábado, Domingo</Text>
                  </View>
                </View>
              )}

              {/* ──────────────── TAB 4: IMPACTO ANTES / DESPUÉS ──────────────── */}
              {activeTab === 'impact' && (
                <View style={s.tabBody}>
                  <View style={s.impactHero}>
                    <Text style={s.impactHeroTitle}>📈 Rendimiento y Aprendizaje Continuo</Text>
                    <Text style={s.impactHeroSub}>
                      Así es como la IA de Alquimia aprende de tus publicaciones y optimiza tu alcance semana a semana.
                    </Text>
                  </View>

                  {/* Comparativa Visual Antes vs Después */}
                  <View style={s.compareGrid}>
                    <View style={s.compareBoxBefore}>
                      <Text style={s.compareLabel}>Antes de Alquimia</Text>
                      <Text style={s.compareValBefore}>
                        {learningMetrics.baselineReach.toLocaleString()}
                      </Text>
                      <Text style={s.compareUnit}>alcance promedio</Text>
                    </View>
                    <View style={s.compareArrow}>
                      <Text style={s.compareArrowText}>&rarr;</Text>
                    </View>
                    <View style={s.compareBoxAfter}>
                      <Text style={s.compareLabelAfter}>Con IA Optimizada</Text>
                      <Text style={s.compareValAfter}>
                        {learningMetrics.aiOptimizedReach.toLocaleString()}
                      </Text>
                      <View style={s.growthChip}>
                        <Text style={s.growthChipText}>+{learningMetrics.percentageImprovement}%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Ponderación del Motor Adaptativo */}
                  <View style={s.weightsCard}>
                    <Text style={s.weightsTitle}>Fórmula del Motor Adaptativo ("Como un Bebé"):</Text>
                    <Text style={s.formulaCode}>
                      Score = ({learningMetrics.alphaPercent}% Mercado) + ({learningMetrics.betaPercent}% Tu Historial)
                    </Text>

                    <View style={s.barWrap}>
                      <View style={[s.barAlpha, { width: `${learningMetrics.alphaPercent}%` }]}>
                        <Text style={s.barLabel}>Mercado ({learningMetrics.alphaPercent}%)</Text>
                      </View>
                      <View style={[s.barBeta, { width: `${learningMetrics.betaPercent}%` }]}>
                        <Text style={s.barLabel}>Tú ({learningMetrics.betaPercent}%)</Text>
                      </View>
                    </View>

                    <Text style={s.weightsExpl}>
                      • Publicaciones analizadas de tu cuenta: <strong>{learningMetrics.totalPublished}</strong>{'\n'}
                      • Nivel del algoritmo: <strong style={{ color: C.cyan }}>
                        {learningMetrics.experienceLevel === 'master' ? 'Maestro del Algoritmo' : learningMetrics.experienceLevel === 'growing' ? 'En Crecimiento Acelerado' : 'Calibrando (Novato Guiado)'}
                      </strong>{'\n'}
                      • Conforme publicas más, la IA aprende exactamente qué duración y gancho te funciona mejor a ti personalmente.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Pie de modal con autoría */}
            <View style={s.footer}>
              <Text style={s.footerAuthor}>Alquimia Studio • Motor de Aprendizaje Continuo e Inteligencia de Mercado</Text>
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
    maxHeight: '92%',
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
  radarIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: C.cyan,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 10, 20, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: C.cyan,
    backgroundColor: C.cyanDim,
  },
  tabText: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: C.white,
  },
  scrollContent: {
    padding: 18,
    gap: 14,
  },
  tabBody: {
    gap: 12,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: C.textSub,
    fontSize: 13,
    textAlign: 'center',
  },
  complianceNotice: {
    backgroundColor: 'rgba(0, 255, 212, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 212, 0.25)',
    borderRadius: 8,
    padding: 10,
  },
  complianceText: {
    color: '#D4FAF2',
    fontSize: 11,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  insertTopBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  insertTopBtnText: {
    color: '#040711',
    fontSize: 10.5,
    fontWeight: '900',
  },
  hashtagList: {
    gap: 8,
  },
  hashtagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#070C16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
  },
  tagRankWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagRankNumber: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  tagHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagName: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  velocityBadge: {
    backgroundColor: C.cyanDim,
    borderWidth: 0.8,
    borderColor: C.cyanBorder,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  velocityText: {
    color: C.cyan,
    fontSize: 9.5,
    fontWeight: '800',
  },
  tagMeta: {
    color: C.textSub,
    fontSize: 11,
    marginTop: 2,
  },
  singleAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.cyanDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleAddText: {
    color: C.cyan,
    fontSize: 16,
    fontWeight: '700',
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#060B14',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 212, 0.25)',
    borderRadius: 8,
    padding: 10,
  },
  soundIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.cyanDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundTitle: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },
  soundMeta: {
    color: C.textSub,
    fontSize: 10.5,
    marginTop: 2,
  },
  soundIdTag: {
    color: C.gold,
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    marginTop: 2,
  },
  refBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: C.cyanBorder,
  },
  refBtnText: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '700',
  },
  guideHeroBanner: {
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  guideHeroTitle: {
    color: C.gold,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  guideHeroSub: {
    color: '#FFF2CC',
    fontSize: 11.5,
    lineHeight: 16,
  },
  templateCard: {
    backgroundColor: '#070D18',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  templateBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: C.cyanDim,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '800',
  },
  durationText: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
  },
  hookText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  structureText: {
    color: C.textSub,
    fontSize: 11.5,
    lineHeight: 17,
  },
  useTemplateBtn: {
    backgroundColor: C.cyan,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  useTemplateBtnText: {
    color: '#040711',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  peakHighlightCard: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.35)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  peakHighlightTitle: {
    color: '#FF6B7A',
    fontSize: 12,
    fontWeight: '800',
  },
  peakHighlightTime: {
    color: C.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginVertical: 4,
  },
  peakHighlightSub: {
    color: C.textSub,
    fontSize: 11,
    textAlign: 'center',
  },
  scheduleItem: {
    backgroundColor: '#070C16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformName: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },
  windowTag: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  hoursPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hourPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hourPillActive: {
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
  },
  hourPillText: {
    color: C.textSub,
    fontSize: 11,
  },
  hourPillTextActive: {
    color: C.cyan,
    fontSize: 11,
    fontWeight: '800',
  },
  daysText: {
    color: C.textMuted,
    fontSize: 10.5,
  },
  impactHero: {
    backgroundColor: 'rgba(0, 255, 127, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 127, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  impactHeroTitle: {
    color: C.green,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  impactHeroSub: {
    color: '#D4FFE7',
    fontSize: 11.5,
    lineHeight: 16,
  },
  compareGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compareBoxBefore: {
    flex: 1,
    backgroundColor: '#070C16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  compareLabel: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
  },
  compareValBefore: {
    color: C.textSub,
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  compareUnit: {
    color: C.textMuted,
    fontSize: 10,
  },
  compareArrow: {
    width: 24,
    alignItems: 'center',
  },
  compareArrowText: {
    color: C.cyan,
    fontSize: 18,
    fontWeight: '900',
  },
  compareBoxAfter: {
    flex: 1,
    backgroundColor: '#070F1E',
    borderWidth: 1,
    borderColor: C.green,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  compareLabelAfter: {
    color: C.green,
    fontSize: 11,
    fontWeight: '800',
  },
  compareValAfter: {
    color: C.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  growthChip: {
    backgroundColor: C.greenBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  growthChipText: {
    color: C.green,
    fontSize: 10.5,
    fontWeight: '900',
  },
  weightsCard: {
    backgroundColor: '#060B14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  weightsTitle: {
    color: C.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  formulaCode: {
    color: '#79C0FF',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  barWrap: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barAlpha: {
    backgroundColor: C.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barBeta: {
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabel: {
    color: '#040711',
    fontSize: 9.5,
    fontWeight: '900',
  },
  weightsExpl: {
    color: C.textSub,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  toast: {
    position: 'absolute',
    top: 55,
    alignSelf: 'center',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#091526',
    borderWidth: 1,
    borderColor: C.green,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toastText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(4, 7, 14, 0.95)',
  },
  footerAuthor: {
    color: C.textSub,
    fontSize: 10.5,
    fontWeight: '600',
  },
  authorSeal: {
    color: C.gold,
    fontSize: 10,
    fontWeight: '700',
  },
});
