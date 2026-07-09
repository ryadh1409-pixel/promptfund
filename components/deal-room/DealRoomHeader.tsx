import { ScreenHeader, ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';

type DealRoomHeaderProps = {
  startupName: string;
};

export function DealRoomHeader({ startupName }: DealRoomHeaderProps) {
  return (
    <ScreenHeader
      subtitle="Deal Room"
      title={startupName}
      leftAction={<ScreenHeaderBackButton />}
    />
  );
}
