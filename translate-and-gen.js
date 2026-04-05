const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'us-central1'
    });

    const originalPrompt = "귀여운 바나나";
    console.log(`Original prompt: ${originalPrompt}`);
    
    // Simple LLM call to translate first
    const chatResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate this to English, return ONLY the english translation: ${originalPrompt}`
    });
    
    const translatedPrompt = chatResponse.text.trim();
    console.log(`Translated prompt: ${translatedPrompt}`);

    console.log("Calling image model with translated prompt...");
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: translatedPrompt,
      config: { 
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      console.log("Image received successfully via translation.");
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
}

test();
