const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'global'
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: "귀여운 바나나",
      config: {
        responseModalities: ["IMAGE"]
      }
    });
    
    if (response.candidates && response.candidates.length > 0) {
        console.log("Success with Korean prompt!");
    }

  } catch (error) {
    console.log("Error:", error.message);
  }
}

test();
