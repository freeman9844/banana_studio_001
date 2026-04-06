import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ 
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT, 
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global' 
});

export async function generateMultimodalWithRetry(promptText: string, imageBase64: string, mimeType: string, maxRetries: number = 3): Promise<string> {


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
      const responseMimeType = imagePart.inlineData.mimeType || 'image/png';
  
      return `data:${responseMimeType};base64,${base64Image}`;

    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && (error as {status?: number}).status === 429 && retries < maxRetries) {
        const delayMs = Math.pow(2, retries + 1) * 1000 + Math.random() * 500;
        console.warn(`[Retry ${retries + 1}/${maxRetries}] 429 Rate limit hit for multimodal. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
}
export async function generateImageWithRetry(promptText: string, maxRetries: number = 3): Promise<string> {

  
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is missing.');
  }

  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: promptText,
        config: {
          responseModalities: ["IMAGE"],
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
  
      return `data:${mimeType};base64,${base64Image}`;

    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && (error as {status?: number}).status === 429 && retries < maxRetries) {
        const delayMs = Math.pow(2, retries + 1) * 1000 + Math.random() * 500;
        console.warn(`[Retry ${retries + 1}/${maxRetries}] 429 Rate limit hit. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
}
