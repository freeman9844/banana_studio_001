const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'global'
    });

    const response = await ai.models.generateImages({
      model: 'gemini-2.5-flash-image',
      prompt: "A cute cat",
      config: { numberOfImages: 1 }
    });
    console.log("Success with gemini-2.5-flash-image on global!");
  } catch (error) {
    console.log("Error with gemini-2.5-flash-image on global:", error.message);
  }
}

test();
