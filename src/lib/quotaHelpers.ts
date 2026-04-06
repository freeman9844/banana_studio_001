import { getQuotas, getConfig } from '@/lib/quotaStore';

export async function validateUserQuota(userId: string, inputPin: string) {
  const quotas = await getQuotas();
  const config = await getConfig();
  const userData = quotas[userId];

  if (!userData) {
    return { error: '등록되지 않은 사용자입니다.', status: 401 };
  }

  if (userData.pin !== inputPin) {
    return { error: '잘못된 PIN 번호입니다.', status: 401 };
  }

  if (userData.usage >= config.maxQuota) {
    return { error: `오늘은 마법을 다 썼어요! (하루 ${config.maxQuota}번 제한)`, status: 429 };
  }

  return { userData, config, error: null };
}