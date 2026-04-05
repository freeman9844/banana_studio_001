const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  // Test JPEG
  console.log("Testing image/jpeg...");
  let start = Date.now();
  try {
    await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        imageConfig: { outputMimeType: "image/jpeg" }
      }
    });
    console.log(`JPEG took: ${Date.now() - start}ms`);
  } catch (e) { console.log("JPEG error:", e.message); }
}

test();
