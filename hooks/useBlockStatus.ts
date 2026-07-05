import { useEffect, useState } from 'react';

import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService, type BlockStatus } from '@/services/userService';

const defaultStatus: BlockStatus = {
  blockedByMe: false,
  blockedMe: false,
};

export function useBlockStatus(currentUserId?: string | null, targetUserId?: string | null) {
  const [blockStatus, setBlockStatus] = useState<BlockStatus>(defaultStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      setBlockStatus(defaultStatus);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    return userService.subscribeBlockStatus(
      currentUserId,
      targetUserId,
      (status) => {
        setBlockStatus(status ?? defaultStatus);
        setIsLoading(false);
      },
      (subscriptionError) => {
        setError(getFriendlyErrorMessage(subscriptionError));
        setBlockStatus(defaultStatus);
        setIsLoading(false);
      },
    );
  }, [currentUserId, targetUserId]);

  return { blockStatus, isLoading, error };
}
