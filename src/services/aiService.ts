import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

function extractImageFromResponse(response: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> }): GeneratedImage {
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No candidates returned from model');
  }

  const parts = response.candidates[0].content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data found in response');
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

export async function generateImageWithRetry(
  promptText: string,
  maxRetries = 3
): Promise<GeneratedImage> {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is missing.');
  }

  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: promptText,
        config: {
          responseModalities: ['IMAGE'],
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return extractImageFromResponse(response);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { status?: number }).status === 429 &&
        retries < maxRetries
      ) {
        const delayMs = Math.pow(2, retries + 1) * 1000 + Math.random() * 500;
        logger.warn(`[Retry ${retries + 1}/${maxRetries}] 429 Rate limit. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

export async function generateMultimodalWithRetry(
  promptText: string,
  imageBase64: string,
  mimeType: string,
  maxRetries = 3
): Promise<GeneratedImage> {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is missing.');
  }

  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
              { text: promptText },
            ],
          },
        ],
        config: {
          responseModalities: ['IMAGE'],
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return extractImageFromResponse(response);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { status?: number }).status === 429 &&
        retries < maxRetries
      ) {
        const delayMs = Math.pow(2, retries + 1) * 1000 + Math.random() * 500;
        logger.warn(`[Retry ${retries + 1}/${maxRetries}] 429 Rate limit multimodal. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}
