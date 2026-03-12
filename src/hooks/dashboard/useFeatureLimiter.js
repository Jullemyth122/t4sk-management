import { useCallback } from 'react';

const LIMIT_COUNT = 3;
const LIMIT_HOURS = 5;
const HOUR_IN_MS = 60 * 60 * 1000;

export function useFeatureLimiter(businessId, uid, planType, isOwner) {
  const isPremium = planType === 'pro' || planType === 'enterprise';

  const getStorageKey = () => `t4sk_feature_usage_${businessId}_${uid}`;

  const getUsage = () => {
    try {
      const data = localStorage.getItem(getStorageKey());
      if (data) {
        return JSON.parse(data);
      }
    } catch(e) {}
    return { count: 0, firstUsed: 0 };
  };

  const setUsage = (usage) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(usage));
  };

  const checkLimit = useCallback(() => {
    if (isPremium) return true; // Premium has no such limits
    if (!isOwner) return false; // Members cannot use premium features on Free plan

    const usage = getUsage();
    const now = Date.now();

    if (usage.firstUsed && (now - usage.firstUsed > LIMIT_HOURS * HOUR_IN_MS)) {
      return true;
    }

    return usage.count < LIMIT_COUNT;
  }, [isPremium, isOwner, businessId, uid]);

  const incrementUsage = useCallback(() => {
    if (isPremium) return;

    const usage = getUsage();
    const now = Date.now();

    if (usage.firstUsed && (now - usage.firstUsed > LIMIT_HOURS * HOUR_IN_MS)) {
      setUsage({ count: 1, firstUsed: now });
    } else {
      setUsage({ 
        count: usage.count + 1, 
        firstUsed: usage.firstUsed || now 
      });
    }
  }, [isPremium, businessId, uid]);

  const getRemainingUses = useCallback(() => {
    if (isPremium) return Infinity;
    if (!isOwner) return 0;

    const usage = getUsage();
    const now = Date.now();

    // If the window has expired, they have a full quota again
    if (usage.firstUsed && (now - usage.firstUsed > LIMIT_HOURS * HOUR_IN_MS)) {
      return LIMIT_COUNT;
    }

    return Math.max(0, LIMIT_COUNT - usage.count);
  }, [isPremium, isOwner, businessId, uid]);

  return { checkLimit, incrementUsage, getRemainingUses, maxUses: LIMIT_COUNT };
}
