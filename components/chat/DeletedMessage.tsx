import { StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';

export function DeletedMessage() {
  return <Text style={styles.text}>This message was deleted.</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.subtle,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
