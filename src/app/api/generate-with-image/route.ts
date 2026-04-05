import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getQuotas, saveQuotas } from '@/lib/quotaStore';

const ai = new GoogleGenAI({ 
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104', 
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global' 
});

const MAX_QUOTA = 20;

export async function POST(request: Request) {
  try {
    const { prompt, user, referenceImageBase64, referenceMimeType } = await request.json();

    if (!prompt || !user || !referenceImageBase64) {
      return NextResponse.json({ error: 'Missing prompt, user, or reference image' }, { status: 400 });
    }

    // Check Quota (Reusing existing logic)
    const quotas = getQuotas();
    const userId = user.nickname;
    const userData = quotas[userId] || { usage: 0, pin: user.pin };
    const currentUsage = userData.usage;
    
    if (currentUsage >= MAX_QUOTA) {
      return NextResponse.json({ error: '오늘은 마법을 다 썼어요! (하루 20번 제한)' }, { status: 429 });
    }

    userData.pin = user.pin;
    quotas[userId] = userData;
    saveQuotas(quotas);

    console.log(`Generating image with reference for ${user.nickname}: ${prompt}`);

    // Retry logic for 429 errors
    const generateMultimodalWithRetry = async (promptText: string, imageBase64: string, mimeType: string, maxRetries: number = 3) => {
      let retries = 0;
      while (true) {
        try {
          return await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: imageBase64,
                      mimeType: mimeType || 'image/jpeg'
                    }
                  },
                  { text: promptText }
                ]
              }
            ],
            config: {
              responseModalities: ["IMAGE"],
              thinkingConfig: { thinkingBudget: 0 },
              imageConfig: { outputMimeType: "image/jpeg" }
            },
          });
        } catch (error: any) {
          if (error.status === 429 && retries < maxRetries) {
            retries++;
            const delayMs = Math.pow(2, retries) * 1000 + Math.random() * 500;
            console.warn(`[Retry ${retries}/${maxRetries}] 429 Rate limit hit. Retrying in ${Math.round(delayMs)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            throw error;
          }
        }
      }
    };

    const response = await generateMultimodalWithRetry(prompt, referenceImageBase64, referenceMimeType);

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned from model");
    }

    const parts = response.candidates[0].content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);

    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        throw new Error("No image data found in response");
    }

    const base64Image = imagePart.inlineData.data;
    const responseMimeType = imagePart.inlineData.mimeType || 'image/jpeg';
    const imageUrl = `data:${responseMimeType};base64,${base64Image}`;

    // Update Quota after successful generation
    const finalQuotas = getQuotas();
    const finalUserData = finalQuotas[userId] || { usage: currentUsage, pin: user.pin };
    const newUsage = finalUserData.usage + 1;
    finalQuotas[userId] = { usage: newUsage, pin: user.pin };
    saveQuotas(finalQuotas);
    
    const remainingQuota = MAX_QUOTA - newUsage;

    return NextResponse.json({ imageUrl, remainingQuota });

  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}