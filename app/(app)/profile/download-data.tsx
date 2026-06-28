import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Card, LoadingState, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { fundingService } from '@/services/fundingService';

export default function DownloadDataScreen() {
  const { authUser, profile } = useAuth();
  const [data, setData] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!authUser?.uid) {
        return;
      }

      try {
        setError(null);
        const investments = await fundingService.listInvestmentsByInvestor(authUser.uid);

        setData({
          profile,
          investments,
          exportedAt: new Date().toISOString(),
        });
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      }
    }

    loadData();
  }, [authUser?.uid, profile]);

  return (
    <Screen eyebrow="Data" title="Download My Data" subtitle="Review your exportable PromptFund account data.">
      {!data ? <LoadingState label="Preparing data export" /> : null}
      {error ? (
        <Card>
          <Text style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text>
        </Card>
      ) : null}
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
