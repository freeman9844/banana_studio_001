import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the SDK for Vertex AI
// We use the 'global' location because gemini-3.1-flash-image-preview is deployed there
const ai = new GoogleGenAI({ 
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104', 
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global' 
});

// Simple in-memory quota tracking for MVP
const globalAny: any = global;
if (!globalAny.userQuotas) {
  globalAny.userQuotas = new Map<string, { usage: number, pin: string }>();
}
const userQuotas = globalAny.userQuotas as Map<string, { usage: number, pin: string }>;
const MAX_QUOTA = 20;

export async function POST(request: Request) {
  try {
    const { prompt, user } = await request.json();

    if (!prompt || !user) {
      return NextResponse.json({ error: 'Missing prompt or user' }, { status: 400 });
    }

    // Check Quota
    const userId = user.nickname; // Using nickname as simple ID for MVP
    const userData = userQuotas.get(userId) || { usage: 0, pin: user.pin };
    const currentUsage = userData.usage;
    
    if (currentUsage >= MAX_QUOTA) {
      return NextResponse.json({ 
        error: '오늘은 마법을 다 썼어요! (하루 20번 제한)' 
      }, { status: 429 });
    }

    // Ensure PIN is always up to date if they somehow login with a new one
    userData.pin = user.pin;
    userQuotas.set(userId, userData);

    console.log(`Generating image for ${user.nickname}: ${prompt}`);

    // Call the Gemini 3.1 Flash Image model using generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        // Setting thinkingBudget to 0 skips the slow "Chain of Thought" phase and halves latency
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned from model");
    }

    const parts = response.candidates[0].content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);

    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        throw new Error("No image data found in response");
    }

    const base64Image = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || 'image/png';

    // Construct a Data URI so the frontend can display it directly
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // Update Quota after successful generation
    const newUsage = currentUsage + 1;
    userQuotas.set(userId, { usage: newUsage, pin: user.pin });
    const remainingQuota = MAX_QUOTA - newUsage;

    return NextResponse.json({ imageUrl, remainingQuota });

  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}