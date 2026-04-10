import bcrypt from 'bcryptjs';
import { getQuotas, getConfig, updateQuotaSafely } from '@/lib/quotaStore';
import { BCRYPT_ROUNDS } from '@/lib/constants';

async function verifyPin(
  nickname: string,
  inputPin: string,
  storedPin: string
): Promise<boolean> {
  const isHashed = storedPin.startsWith('$2b$') || storedPin.startsWith('$2a$');

  if (isHashed) {
    return bcrypt.compare(inputPin, storedPin);
  }

  // Legacy plain-text: compare then migrate to hash
  if (storedPin !== inputPin) return false;

  const hashedPin = await bcrypt.hash(inputPin, BCRYPT_ROUNDS);
  await updateQuotaSafely(nickname, (existing) => ({
    ...existing!,
    pin: hashedPin,
  }));
  return true;
}

export async function validateUserQuota(userId: string, inputPin: string) {
  const quotas = await getQuotas();
  const config = await getConfig();
  const userData = quotas[userId];

  if (!userData) {
    return { error: '등록되지 않은 사용자입니다.', status: 401 };
  }

  const pinValid = await verifyPin(userId, inputPin, userData.pin);
  if (!pinValid) {
    return { error: '잘못된 PIN 번호입니다.', status: 401 };
  }

  if (userData.usage >= config.maxQuota) {
    return { error: `오늘은 마법을 다 썼어요! (하루 ${config.maxQuota}번 제한)`, status: 429 };
  }

  return { userData, config, error: null, status: undefined };
}
