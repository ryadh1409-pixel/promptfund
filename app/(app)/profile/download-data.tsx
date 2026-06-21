import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Card, LoadingState, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { userService } from '@/services/userService';

export default function DownloadDataScreen() {
  const { authUser, profile } = useAuth();
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!authUser) {
        return;
      }

      const [blockedUsers, investments] = await Promise.all([
        userService.listBlockedUsers(authUser.uid),
        fundingService.listInvestmentsByInvestor(authUser.uid),
      ]);

      setData({
        profile,
        blockedUsers,
        investments,
        exportedAt: new Date().toISOString(),
      });
    }

    loadData();
  }, [authUser, profile]);

  return (
    <Screen eyebrow="Data" title="Download My Data" subtitle="Review your exportable PromptFund account data.">
      {!data ? <LoadingState label="Preparing data export" /> : null}
      {data ? (
        <Card>
          <ScrollView horizontal>
            <Text style={{ color: colors.text, fontFamily: 'Courier', lineHeight: 20 }}>
              {JSON.stringify(data, null, 2)}
            </Text>
          </ScrollView>
        </Card>
      ) : null}
    </Screen>
  );
}
