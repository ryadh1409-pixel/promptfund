import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import type { DealPipeline } from '@/utils/investmentPipeline';
import { getStepperItems } from '@/utils/dealRoom';

export function DealRoomProgressStepper({ pipeline }: { pipeline: DealPipeline }) {
  const items = getStepperItems(pipeline);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {items.map((item, index) => (
        <View key={item.key} style={styles.item}>
          <View style={[
            styles.marker,
            item.completed ? styles.markerDone : null,
            item.isCurrent ? styles.markerCurrent : null,
          ]}>
            <Text style={[
              styles.markerText,
              item.isCurrent ? styles.markerTextCurrent : null,
            ]}>
              {item.symbol}
            </Text>
          </View>
          <Text style={[
            styles.label,
            item.completed ? styles.labelDone : null,
            item.isCurrent ? styles.labelCurrent : null,
          ]} numberOfLines={1}>
            {item.label}
          </Text>
          {index < items.length - 1 ? <View style={styles.connector} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 4,
    paddingBottom: 4,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    maxWidth: 120,
  },
  marker: {
    alignItems: 'center',
    backgroundColor: colors.panelMuted,
    borderColor: 'rgba(216, 201, 163, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  markerDone: {
    backgroundColor: 'rgba(200, 162, 74, 0.14)',
    borderColor: colors.accent,
  },
  markerCurrent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  markerText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  markerTextCurrent: {
    color: colors.black,
  },
  label: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    maxWidth: 88,
  },
  labelDone: {
    color: colors.muted,
  },
  labelCurrent: {
    color: colors.accent,
    fontWeight: '800',
  },
  connector: {
    backgroundColor: 'rgba(216, 201, 163, 0.18)',
    height: 1,
    marginLeft: 2,
    width: 12,
  },
});
