import { useEffect, useState } from 'react';

import { mapInvestmentToStartupCard, mapOpportunityToStartupCard, type StartupCard } from '@/components/cards/StartupPlayingCard';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { InvestmentOpportunity, V5Investment } from '@/types/InvestmentFlow';

export function useStartupCardFromOpportunity(opportunityId?: string | null) {
  const [card, setCard] = useState<StartupCard | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(opportunityId));

  useEffect(() => {
    if (!opportunityId) {
      setCard(null);
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);
    investmentFlowService.getOpportunity(opportunityId)
      .then((opportunity) => {
        if (!isMounted) {
          return;
        }
        setCard(opportunity ? mapOpportunityToStartupCard(opportunity) : null);
      })
      .catch(() => {
        if (isMounted) {
          setCard(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [opportunityId]);

  return { card, isLoading };
}

export function useStartupCardFromInvestment(investment: V5Investment | null) {
  const opportunityId = investment?.opportunityId ?? investment?.startupId ?? null;
  const [card, setCard] = useState<StartupCard | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(investment));

  useEffect(() => {
    if (!investment) {
      setCard(null);
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadCard = async () => {
      let opportunity: InvestmentOpportunity | null = null;
      if (opportunityId) {
        opportunity = await investmentFlowService.getOpportunity(opportunityId);
      }
      if (!isMounted) {
        return;
      }
      setCard(mapInvestmentToStartupCard(investment, opportunity));
      setIsLoading(false);
    };

    loadCard().catch(() => {
      if (isMounted) {
        setCard(mapInvestmentToStartupCard(investment));
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [investment, opportunityId]);

  return { card, isLoading };
}
