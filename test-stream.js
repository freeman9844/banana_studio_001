const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  console.log("Testing Streaming Gemini 3.1...");
  let start = Date.now();
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { responseModalities: ["IMAGE"] }
    });
    
    for await (const chunk of stream) {
      console.log(`Received chunk after ${Date.now() - start}ms`);
      if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
          const parts = chunk.candidates[0].content.parts;
          for (const part of parts) {
              if (part.inlineData) {
                  console.log(`Got image chunk! length: ${part.inlineData.data.length}`);
              }
              if (part.text) {
                  console.log(`Got text chunk: ${part.text.substring(0, 20)}`);
              }
          }
      }
    }
    console.log(`Total time: ${Date.now() - start}ms`);
  } catch (e) { console.log("Stream error:", e.message); }
}

test();
