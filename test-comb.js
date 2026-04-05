const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  console.log("Testing combined speed...");
  let start = Date.now();
  try {
    const resp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        thinkingConfig: { thinkingBudget: 0 },
        // imageConfig: { imageSize: "512" } // actually Gemini 3.1 might not use this for image gen if it is part of content generation, but let's test if it takes it.
      }
    });
    console.log(`Time took: ${Date.now() - start}ms`);
    console.log(`Success: ${!!resp.candidates}`);
  } catch (e) { console.log("error:", e.message); }
}

test();
