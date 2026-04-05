const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'us-central1'
  });

  const prompt = "A cute little dog playing with a ball";

  // Test Imagen 3
  console.log("Testing Imagen 3.0...");
  let start = Date.now();
  try {
    await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
    });
    console.log(`Imagen 3.0 took: ${Date.now() - start}ms`);
  } catch (e) { console.log("Imagen error:", e.message); }

  const aiGlobal = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  // Test Gemini 3.1 Flash Image Preview with NO thinking
  console.log("\nTesting Gemini 3.1 Flash Image Preview (No Thinking)...");
  start = Date.now();
  try {
    await aiGlobal.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        imageConfig: { imageSize: "512" }
      }
    });
    console.log(`Gemini 3.1 512px took: ${Date.now() - start}ms`);
  } catch (e) { console.log("Gemini error:", e.message); }
}

test();
