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
      prompt: "A blue elephant riding a bicycle on the moon",
      config: { numberOfImages: 1 }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      console.log("Success! Image generated.");
    } else {
      console.log("No images returned.", response);
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
}

test();
