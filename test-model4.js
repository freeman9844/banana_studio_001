const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'us-central1'
    });

    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: "A cute cat",
      config: { numberOfImages: 1 }
    });
    console.log("Success with imagen-3.0-generate-002!");
  } catch (error) {
    console.log("Error with imagen-3.0-generate-002:", error.message);
  }
}

test();
