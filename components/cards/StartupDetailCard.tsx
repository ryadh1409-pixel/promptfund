import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { StartupPlayingCard, type StartupCard } from '@/components/cards/StartupPlayingCard';

export function StartupDetailCard({
  card,
  stageLabel,
  style,
}: {
  card: StartupCard;
  stageLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <StartupPlayingCard card={card} stageLabel={stageLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
