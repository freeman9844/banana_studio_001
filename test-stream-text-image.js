const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  console.log("Testing Streaming TEXT+IMAGE Gemini 3.1...");
  let start = Date.now();
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-image-preview',
      contents: `Write a short 3-sentence story about ${prompt}, then generate the image.`,
      config: { 
        responseModalities: ["TEXT", "IMAGE"]
      }
    });
    
    for await (const chunk of stream) {
      console.log(`[${Date.now() - start}ms] Received chunk.`);
      if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
          const parts = chunk.candidates[0].content.parts;
          for (const part of parts) {
              if (part.inlineData) {
                  console.log(`   -> IMAGE CHUNK! length: ${part.inlineData.data.length}`);
              }
              if (part.text) {
                  console.log(`   -> TEXT CHUNK: ${part.text}`);
              }
          }
      }
    }
  } catch (e) { console.log("Stream error:", e.message); }
}

test();
