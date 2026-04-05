const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'us-central1'
    });

    const response = await ai.models.generateImages({
      model: 'gemini-3.1-flash-image-preview',
      prompt: "A cute cat",
      config: { numberOfImages: 1 }
    });
    console.log("Success with us-central1!");
  } catch (error) {
    console.log("Error with us-central1:", error.message);
  }
}

test();
