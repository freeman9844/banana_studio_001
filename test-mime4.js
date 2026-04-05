const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'global'
  });

  const prompt = "A cute little dog playing with a ball";

  console.log("Testing with generateContentConfig: { imageConfig: { outputMimeType: 'image/jpeg' } } ...");
  let start = Date.now();
  try {
    const resp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: { 
        responseModalities: ["IMAGE"],
        thinkingConfig: { thinkingBudget: 0 },
        // Using correct structure per your python snippet
        imageConfig: { outputMimeType: "image/jpeg" }
      }
    });
    console.log(`Took: ${Date.now() - start}ms`);
    if (resp.candidates && resp.candidates[0].content.parts) {
        const parts = resp.candidates[0].content.parts;
        for (const p of parts) {
            if (p.inlineData) {
                console.log(`MimeType returned: ${p.inlineData.mimeType}`);
                console.log(`Base64 length: ${p.inlineData.data.length}`);
            }
        }
    }
  } catch (e) { console.log("error:", e.message); }
}

test();
