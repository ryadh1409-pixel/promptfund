import { type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';

export const PLAYING_CARD_THEME = {
  background: '#F8F5EE',
  border: '#A62323',
  text: '#1F1F1F',
  secondary: '#666666',
  suit: '#A62323',
};

export const playingCardSerifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export function PlayingCardTextureOverlay() {
  return <View style={decorStyles.textureOverlay} pointerEvents="none" />;
}

export function PlayingCardCornerMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={decorStyles.cornerMark}>
      <Text style={[decorStyles.cornerRank, compact ? decorStyles.cornerRankCompact : null]}>A</Text>
      <Text style={[decorStyles.cornerSuit, compact ? decorStyles.cornerSuitCompact : null]}>♥</Text>
    </View>
  );
}

export function PlayingCardCornerAnchors({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <View style={decorStyles.topCorner}>
        <PlayingCardCornerMark compact={compact} />
      </View>
      <View style={decorStyles.bottomCorner}>
        <PlayingCardCornerMark compact={compact} />
      </View>
    </>
  );
}

export function PlayingCardOrnament({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[decorStyles.ornament, compact ? decorStyles.ornamentCompact : null]}>
      <View style={decorStyles.ornamentLine} />
      <Text style={[decorStyles.ornamentHeart, compact ? decorStyles.ornamentHeartCompact : null]}>♥</Text>
      <View style={decorStyles.ornamentLine} />
    </View>
  );
}

export const playingCardShellStyles = StyleSheet.create({
  card: {
    backgroundColor: PLAYING_CARD_THEME.background,
    borderColor: PLAYING_CARD_THEME.border,
    borderRadius: 30,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
});

export function PlayingCardFrame({
  compact = false,
  style,
  children,
}: {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View style={[playingCardShellStyles.card, style]}>
      <PlayingCardTextureOverlay />
      <PlayingCardCornerAnchors compact={compact} />
      {children}
    </View>
  );
}

const decorStyles = StyleSheet.create({
  textureOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    opacity: 0.35,
  },
  topCorner: {
    left: spacing.md,
    position: 'absolute',
    top: spacing.sm,
    zIndex: 2,
  },
  bottomCorner: {
    bottom: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    transform: [{ rotate: '180deg' }],
    zIndex: 2,
  },
  cornerMark: {
    alignItems: 'center',
    gap: 1,
  },
  cornerRank: {
    color: PLAYING_CARD_THEME.suit,
    fontFamily: playingCardSerifFont,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  cornerRankCompact: {
    fontSize: 22,
    lineHeight: 24,
  },
  cornerSuit: {
    color: PLAYING_CARD_THEME.suit,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  cornerSuitCompact: {
    fontSize: 14,
    lineHeight: 14,
  },
  ornament: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  ornamentCompact: {
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  ornamentLine: {
    backgroundColor: 'rgba(166, 35, 35, 0.22)',
    flex: 1,
    height: 1,
  },
  ornamentHeart: {
    color: PLAYING_CARD_THEME.suit,
    fontSize: 11,
    lineHeight: 12,
  },
  ornamentHeartCompact: {
    fontSize: 9,
    lineHeight: 10,
  },
});
