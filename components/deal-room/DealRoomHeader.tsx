import { ScreenHeader, ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';
import { ChatSettingsButton } from '@/components/chat/ChatSettings';

type DealRoomHeaderProps = {
  startupName: string;
  onSafetyPress?: () => void;
};

export function DealRoomHeader({ startupName, onSafetyPress }: DealRoomHeaderProps) {
  return (
    <ScreenHeader
      subtitle="Deal Room"
      title={startupName}
      leftAction={<ScreenHeaderBackButton />}
      rightAction={onSafetyPress ? <ChatSettingsButton onPress={onSafetyPress} /> : undefined}
    />
  );
}
