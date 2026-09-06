// ============================================================
// src/components/compose/ComposeBox.tsx
// Caja de redacción unificada con emojis y hashtags rápidos
// ============================================================

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAppStore } from '../../store/useAppStore';

// Hashtags de tendencia (en producción vendrían de una API)
const QUICK_HASHTAGS = [
  '#viral', '#fyp', '#trending', '#reels', '#shorts',
  '#content', '#creator', '#explore',
];

// Emojis frecuentes
const QUICK_EMOJIS = ['🔥', '✨', '💯', '🚀', '❤️', '🎯', '💡', '🌟', '👏', '🎬'];

export function ComposeBox() {
  const { caption, hashtags, setCaption, addHashtag, removeHashtag } = useAppStore();
  const [showEmojis, setShowEmojis] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const inputRef = useRef<TextInput>(null);

  const charCount = caption.length;
  const maxChars = 2200; // Instagram limit (más restrictivo)

  const handleAddHashtag = (tag: string) => {
    addHashtag(tag);
    setHashtagInput('');
    setShowHashtags(false);
  };

  const handleEmojiPress = (emoji: string) => {
    setCaption(caption + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.dot} />
          <Text style={styles.headerLabel}>DESCRIPCIÓN</Text>
        </View>
        <Text
          style={[
            styles.counter,
            charCount > maxChars * 0.9 && styles.counterWarning,
          ]}
        >
          {charCount}/{maxChars}
        </Text>
      </View>

      {/* Campo de texto */}
      <TextInput
        ref={inputRef}
        value={caption}
        onChangeText={setCaption}
        placeholder="Escribe tu descripción / pie de foto aquí..."
        placeholderTextColor={COLORS.text.muted}
        multiline
        maxLength={maxChars}
        style={styles.input}
        textAlignVertical="top"
        returnKeyType="default"
      />

      {/* Hashtags añadidos */}
      {hashtags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hashtagScroll}
          contentContainerStyle={styles.hashtagScrollContent}
        >
          {hashtags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => removeHashtag(tag)}
              style={styles.hashtagPill}
            >
              <Text style={styles.hashtagPillText}>{tag}</Text>
              <Ionicons name="close" size={10} color={COLORS.neon.turquoise} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Barra de herramientas */}
      <View style={styles.toolbar}>
        {/* Botón emoji */}
        <TouchableOpacity
          onPress={() => {
            setShowEmojis((v) => !v);
            setShowHashtags(false);
            Keyboard.dismiss();
          }}
          style={[styles.toolBtn, showEmojis && styles.toolBtnActive]}
        >
          <Text style={styles.toolBtnEmoji}>😊</Text>
          <Text style={styles.toolBtnLabel}>Emoji</Text>
        </TouchableOpacity>

        {/* Botón hashtag */}
        <TouchableOpacity
          onPress={() => {
            setShowHashtags((v) => !v);
            setShowEmojis(false);
          }}
          style={[styles.toolBtn, showHashtags && styles.toolBtnActive]}
        >
          <Ionicons name="pricetag-outline" size={14} color={showHashtags ? COLORS.neon.turquoise : COLORS.text.secondary} />
          <Text style={[styles.toolBtnLabel, showHashtags && styles.toolBtnLabelActive]}>
            #{hashtags.length > 0 ? hashtags.length : 'Tags'}
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        {/* Contador de plataformas */}
        <View style={styles.charIndicator}>
          <View
            style={[
              styles.charBar,
              {
                width: `${Math.min((charCount / maxChars) * 100, 100)}%`,
                backgroundColor:
                  charCount > maxChars * 0.9
                    ? COLORS.status.warning
                    : COLORS.neon.turquoise,
              },
            ]}
          />
        </View>
      </View>

      {/* Panel de emojis */}
      {showEmojis && (
        <View style={styles.panel}>
          <View style={styles.emojiGrid}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Panel de hashtags */}
      {showHashtags && (
        <View style={styles.panel}>
          {/* Input de hashtag personalizado */}
          <View style={styles.hashtagInputRow}>
            <Text style={styles.hashSymbol}>#</Text>
            <TextInput
              value={hashtagInput}
              onChangeText={setHashtagInput}
              placeholder="escribe_tu_hashtag"
              placeholderTextColor={COLORS.text.muted}
              style={styles.hashtagInputField}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (hashtagInput.trim()) handleAddHashtag(hashtagInput.trim());
              }}
            />
            <TouchableOpacity
              onPress={() => {
                if (hashtagInput.trim()) handleAddHashtag(hashtagInput.trim());
              }}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={18} color={COLORS.bg.deepBlack} />
            </TouchableOpacity>
          </View>

          {/* Hashtags rápidos */}
          <View style={styles.quickHashtags}>
            {QUICK_HASHTAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => handleAddHashtag(tag)}
                style={[
                  styles.quickTag,
                  hashtags.includes(tag) && styles.quickTagActive,
                ]}
              >
                <Text
                  style={[
                    styles.quickTagText,
                    hashtags.includes(tag) && styles.quickTagTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neon.turquoise,
  },
  headerLabel: {
    color: COLORS.text.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  counter: {
    color: COLORS.text.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  counterWarning: {
    color: COLORS.status.warning,
  },
  input: {
    color: COLORS.text.primary,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 90,
    paddingVertical: 8,
  },
  hashtagScroll: {
    marginTop: 8,
  },
  hashtagScrollContent: {
    gap: 6,
    paddingRight: 4,
  },
  hashtagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.neon.turquoiseFaint,
    borderWidth: 1,
    borderColor: COLORS.glass.borderNeon,
  },
  hashtagPillText: {
    color: COLORS.neon.turquoise,
    fontSize: 12,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.glass.border,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.glass.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  toolBtnActive: {
    borderColor: COLORS.glass.borderNeon,
    backgroundColor: COLORS.neon.turquoiseFaint,
  },
  toolBtnEmoji: {
    fontSize: 14,
  },
  toolBtnLabel: {
    color: COLORS.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  toolBtnLabelActive: {
    color: COLORS.neon.turquoise,
  },
  spacer: { flex: 1 },
  charIndicator: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.bg.elevated,
    overflow: 'hidden',
  },
  charBar: {
    height: '100%',
    borderRadius: 2,
  },
  panel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bg.elevated,
    borderWidth: 0.5,
    borderColor: COLORS.glass.border,
    gap: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emojiText: {
    fontSize: 22,
  },
  hashtagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: COLORS.glass.borderNeon,
  },
  hashSymbol: {
    color: COLORS.neon.turquoise,
    fontSize: 15,
    fontWeight: '700',
  },
  hashtagInputField: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    paddingVertical: 6,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.neon.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: COLORS.glass.border,
  },
  quickTagActive: {
    backgroundColor: COLORS.neon.turquoiseFaint,
    borderColor: COLORS.glass.borderNeon,
  },
  quickTagText: {
    color: COLORS.text.secondary,
    fontSize: 12,
  },
  quickTagTextActive: {
    color: COLORS.neon.turquoise,
    fontWeight: '600',
  },
});
