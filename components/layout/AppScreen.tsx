import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

export type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  edges?: Edge[];
  horizontalPadding?: number | false;
  bottomPadding?: number | false;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  footer?: ReactNode;
};

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right', 'bottom'];

export function AppScreen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  keyboardVerticalOffset,
  edges = DEFAULT_EDGES,
  horizontalPadding = spacing.lg,
  bottomPadding = spacing.lg,
  contentContainerStyle,
  style,
  backgroundColor = colors.background,
  statusBarStyle = 'light',
  footer,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const resolvedKeyboardOffset = keyboardVerticalOffset ?? insets.top;
  const paddingHorizontal = horizontalPadding === false ? 0 : horizontalPadding;
  const resolvedBottomPadding = bottomPadding === false ? 0 : bottomPadding;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        paddingHorizontal ? { paddingHorizontal } : null,
        resolvedBottomPadding ? { paddingBottom: resolvedBottomPadding } : null,
        styles.scrollContent,
        contentContainerStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        paddingHorizontal ? { paddingHorizontal } : null,
        resolvedBottomPadding ? { paddingBottom: resolvedBottomPadding } : null,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={resolvedKeyboardOffset}
      style={styles.flex}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }, style]} edges={edges}>
      <StatusBar style={statusBarStyle} />
      <View style={styles.flex}>
        {body}
        {footer ? (
          <View
            style={[
              paddingHorizontal ? { paddingHorizontal } : null,
              { paddingBottom: Math.max(insets.bottom, spacing.sm) },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function useAppSafeAreaInsets() {
  return useSafeAreaInsets();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
