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
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  footer?: ReactNode;
};

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

export function AppScreen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  keyboardVerticalOffset,
  edges = DEFAULT_EDGES,
  horizontalPadding = spacing.lg,
  contentContainerStyle,
  style,
  backgroundColor = colors.background,
  statusBarStyle = 'light',
  footer,
}: AppScreenProps) {
  const resolvedKeyboardOffset = keyboardVerticalOffset ?? 0;
  const paddingHorizontal = horizontalPadding === false ? 0 : horizontalPadding;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        paddingHorizontal ? { paddingHorizontal } : null,
        styles.scrollContent,
        contentContainerStyle,
      ]}
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
        {footer ? <View style={paddingHorizontal ? { paddingHorizontal } : null}>{footer}</View> : null}
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
