import { ActionSheetIOS, Alert, Platform } from 'react-native';

type ActionSheetOption = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export function showNativeActionSheet({
  title,
  options,
  onCancel,
}: {
  title: string;
  options: ActionSheetOption[];
  onCancel?: () => void;
}) {
  if (Platform.OS === 'ios' && typeof ActionSheetIOS?.showActionSheetWithOptions === 'function') {
    const labels = [...options.map((option) => option.label), 'Cancel'];
    const destructiveButtonIndex = options.findIndex((option) => option.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (buttonIndex) => {
        if (buttonIndex === undefined || buttonIndex === labels.length - 1) {
          onCancel?.();
          return;
        }
        options[buttonIndex]?.onPress();
      },
    );
    return true;
  }

  return false;
}

export function showNativeAlertActionSheet({
  title,
  message,
  options,
}: {
  title: string;
  message?: string;
  options: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
}) {
  Alert.alert(title, message, options);
}
