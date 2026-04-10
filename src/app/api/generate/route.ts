import { NextResponse } from 'next/server';
import { generateImageWithRetry } from '@/services/aiService';
import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';

export async function POST(request: Request) {
  try {
    const { prompt, user } = await request.json();

    if (!prompt || !user) {
      return NextResponse.json({ error: 'Missing prompt or user' }, { status: 400 });
    }

    return handleGenerateRequest(user.nickname, user.pin, (config) =>
      generateImageWithRetry(buildAugmentedPrompt(prompt, config))
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
