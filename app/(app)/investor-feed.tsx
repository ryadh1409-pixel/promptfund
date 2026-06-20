import { Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  LoadingState,
  Pill,
  PrimaryLink,
  Screen,
  SectionTitle,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { fundingRequests, investorUser, projects } from '@/data/mockData';
import { formatCurrency } from '@/utils/format';

export default function InvestorFeedScreen() {
  const isLoading = false;

  return (
    <Screen
      eyebrow="PromptFund Investor Feed"
      title="Small checks with visible progress"
      subtitle={`${investorUser.name}'s feed surfaces focused AI-tool requests from developers with traction, receipts, and milestone proof.`}
    >
      {isLoading ? <LoadingState label="Loading investor-ready requests" /> : null}

      <SectionTitle title="Open opportunities" />
      {!isLoading && fundingRequests.length === 0 ? (
        <EmptyState
          title="No active requests"
          message="PromptFund will surface new tool-budget requests here when builders publish investor-ready asks."
          action={<PrimaryLink href="/dashboard" label="Review dashboard" variant="secondary" />}
        />
      ) : null}

      {!isLoading && fundingRequests.map((request) => {
        const project = projects.find((item) => item.id === request.projectId);

        return (
          <Card key={request.id}>
            <View style={ui.wrap}>
              <Pill label={request.tool} tone="rgba(139, 92, 246, 0.28)" />
              <Pill label={request.status} tone="rgba(34, 211, 238, 0.18)" />
              <Pill label={request.dueDate} />
            </View>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
              {formatCurrency(request.amount)} for {project?.title}
            </Text>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>{request.reason}</Text>
            <View style={ui.row}>
              <PrimaryLink href={`/projects/${request.projectId}`} label="View progress" variant="secondary" />
              <PrimaryLink href="/wallet" label="Fund with PromptFund" />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
