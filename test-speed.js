const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  // Test 1: Default
  console.log("Testing default settings...");
  let start = Date.now();
  try {
    await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { responseModalities: ["IMAGE"] }
    });
    console.log(`Default took: ${Date.now() - start}ms`);
  } catch (e) { console.log("Default error:", e.message); }

  // Test 2: 512 image size
  console.log("\nTesting 512 image size...");
  start = Date.now();
  try {
    await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        imageConfig: { imageSize: "512" }
      }
    });
    console.log(`512 took: ${Date.now() - start}ms`);
  } catch (e) { console.log("512 error:", e.message); }
  
  // Test 3: 256 image size
  console.log("\nTesting 256 image size...");
  start = Date.now();
  try {
    await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        imageConfig: { imageSize: "256" }
      }
    });
    console.log(`256 took: ${Date.now() - start}ms`);
  } catch (e) { console.log("256 error:", e.message); }
}

test();
