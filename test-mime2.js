const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  console.log("Testing PNG (Default)...");
  let start = Date.now();
  try {
    const resp1 = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    console.log(`PNG took: ${Date.now() - start}ms`);
  } catch (e) { console.log("PNG error:", e.message); }

  console.log("\nTesting JPEG...");
  start = Date.now();
  try {
    const resp2 = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        thinkingConfig: { thinkingBudget: 0 },
        // Need to check if outputMimeType works inside config for generateContent
        // Or if it needs to be inside something like imageConfig?
        outputMimeType: "image/jpeg" 
      }
    });
    console.log(`JPEG took: ${Date.now() - start}ms`);
  } catch (e) { console.log("JPEG error:", e.message); }
}

test();
