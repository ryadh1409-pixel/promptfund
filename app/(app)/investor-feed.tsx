import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  LoadingState,
  Pill,
  PrimaryButton,
  PrimaryLink,
  Screen,
  SectionTitle,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { FundingRequest } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import { formatCurrency } from '@/utils/format';

export default function InvestorFeedScreen() {
  const { authUser, profile } = useAuth();
  const [fundingRequests, setFundingRequests] = useState<FundingRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fundingRequestId, setFundingRequestId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvestorFeed() {
      setIsLoading(true);

      try {
        const [nextRequests, nextProjects] = await Promise.all([
          fundingService.listFundingRequests(),
          projectService.listProjects(),
        ]);

        setFundingRequests(nextRequests);
        setProjects(nextProjects);
      } finally {
        setIsLoading(false);
      }
    }

    loadInvestorFeed();
  }, []);

  async function handleFundRequest(request: FundingRequest) {
    if (!authUser) {
      return;
    }

    setFundingRequestId(request.id);

    try {
      await fundingService.createInvestment({
        investorId: authUser.uid,
        projectId: request.projectId,
        amount: request.amount,
        note: `Investment for ${request.tool}`,
      });
    } finally {
      setFundingRequestId(null);
    }
  }

  return (
    <Screen
      eyebrow="PromptFund Investor Feed"
      title="Small checks with visible progress"
      subtitle={`${profile?.name ?? 'Your'} feed surfaces focused AI-tool requests from developers with traction, receipts, and milestone proof.`}
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
              <PrimaryButton
                label={fundingRequestId === request.id ? 'Funding...' : 'Fund with PromptFund'}
                disabled={fundingRequestId === request.id}
                onPress={() => handleFundRequest(request)}
              />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
