const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  console.log("Testing Gemini 3.1 with thinkingConfig...");
  let start = Date.now();
  try {
    await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    console.log(`thinkingBudget 0 took: ${Date.now() - start}ms`);
  } catch (e) { console.log("thinkingBudget 0 error:", e.message); }

  start = Date.now();
  try {
    await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        thinkingConfig: { thinkingLevel: "LOW" } 
      }
    });
    console.log(`thinkingLevel LOW took: ${Date.now() - start}ms`);
  } catch (e) { console.log("LOW error:", e.message); }
}

test();
