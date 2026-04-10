import { NextResponse } from 'next/server';
import { generateMultimodalWithRetry } from '@/services/aiService';
import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';

export async function POST(request: Request) {
  try {
    const { prompt, user, referenceImageBase64, referenceMimeType } = await request.json();

    if (!prompt || !user || !referenceImageBase64) {
      return NextResponse.json({ error: 'Missing prompt, user, or reference image' }, { status: 400 });
    }

    return handleGenerateRequest(user.nickname, user.pin, (config) =>
      generateMultimodalWithRetry(buildAugmentedPrompt(prompt, config), referenceImageBase64, referenceMimeType)
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
