import { NextResponse } from 'next/server';
import { updateQuotaSafely, GlobalConfig } from '@/lib/quotaStore';
import { validateUserQuota } from '@/lib/quotaHelpers';
import { logger } from '@/lib/logger';
import { GeneratedImage } from '@/services/aiService';

export function buildAugmentedPrompt(prompt: string, config: GlobalConfig): string {
  const suffix = config.resolution === '1024'
    ? ', high quality, 1024x1024 resolution'
    : ', low quality, 512x512 resolution';
  return prompt + suffix;
}

export async function handleGenerateRequest(
  userId: string,
  inputPin: string,
  generateFn: (config: GlobalConfig) => Promise<GeneratedImage>
): Promise<NextResponse> {
  const { userData, config, error, status } = await validateUserQuota(userId, inputPin);
  if (error || !userData || !config) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  try {
    const { base64, mimeType } = await generateFn(config);
    const imageUrl = `data:${mimeType};base64,${base64}`;

    const finalUserData = await updateQuotaSafely(userId, (existing) => ({
      usage: (existing?.usage ?? userData.usage) + 1,
      pin: existing?.pin ?? inputPin,
    }));

    const remainingQuota = Math.max(0, config.maxQuota - finalUserData.usage);
    return NextResponse.json({ imageUrl, remainingQuota });
  } catch (err: unknown) {
    if (err instanceof Error) {
      logger.error('Error generating image:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
