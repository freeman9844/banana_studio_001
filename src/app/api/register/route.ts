import { NextResponse } from 'next/server';
import { getQuotas, updateQuotaSafely } from '@/lib/quotaStore';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/lib/constants';

async function isPinValid(inputPin: string, storedPin: string): Promise<boolean> {
  const isHashed = storedPin.startsWith('$2b$') || storedPin.startsWith('$2a$');
  return isHashed
    ? bcrypt.compare(inputPin, storedPin)
    : storedPin === inputPin;
}

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: 'Nickname and pin are required' }, { status: 400 });
    }

    const quotas = await getQuotas();
    const existingUser = quotas[nickname];

    if (existingUser) {
      const valid = await isPinValid(pin, existingUser.pin);
      if (!valid) {
        return NextResponse.json({ error: '등록된 별명입니다. 올바른 PIN을 입력해주세요.' }, { status: 401 });
      }

      // Migrate plain-text PIN to hash
      const isAlreadyHashed = existingUser.pin.startsWith('$2b$') || existingUser.pin.startsWith('$2a$');
      if (!isAlreadyHashed) {
        const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
        await updateQuotaSafely(nickname, (existing) => ({
          ...existing!,
          pin: hashedPin,
        }));
      }

      return NextResponse.json({ success: true, message: `Student ${nickname} logged in` });
    }

    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await updateQuotaSafely(nickname, () => ({ usage: 0, pin: hashedPin }));

    return NextResponse.json({ success: true, message: `Student ${nickname} registered` });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error registering student:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
