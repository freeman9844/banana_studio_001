import { NextResponse } from 'next/server';
import { updateQuotaSafely } from '@/lib/quotaStore';
import { validateUserQuota } from '@/lib/quotaHelpers';
import { generateMultimodalWithRetry } from '@/services/aiService';

export async function POST(request: Request) {
  try {
    const { prompt, user, referenceImageBase64, referenceMimeType } = await request.json();

    if (!prompt || !user || !referenceImageBase64) {
      return NextResponse.json({ error: 'Missing prompt, user, or reference image' }, { status: 400 });
    }

    const userId = user.nickname;
    const inputPin = user.pin;

    // Validation
    const { userData, config, error, status } = await validateUserQuota(userId, inputPin);
    if (error || !userData || !config) {
      return NextResponse.json({ error }, { status: status || 401 });
    }

    const isHighRes = config.resolution === '1024';
    const resolutionPrompt = isHighRes ? ', high quality, 1024x1024 resolution' : ', low quality, 512x512 resolution';
    const augmentedPrompt = prompt + resolutionPrompt;

    console.log(`Generating image with reference for ${user.nickname} (res: ${config.resolution}): ${augmentedPrompt}`);

    // Call AI Service for MultiModal image generation
    const imageUrl = await generateMultimodalWithRetry(augmentedPrompt, referenceImageBase64, referenceMimeType);

    // Safely increment usage using the mutex lock
    const finalUserData = await updateQuotaSafely(userId, (existing) => {
      // Fallback in case the user data was unexpectedly removed
      const currentUsage = existing ? existing.usage : userData.usage;
      const currentPin = existing ? existing.pin : inputPin;
      return { ...existing, usage: currentUsage + 1, pin: currentPin };
    });
    
    const remainingQuota = Math.max(0, config.maxQuota - finalUserData.usage);
    
    return NextResponse.json({ imageUrl, remainingQuota });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error generating image:', error.message);
      return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
