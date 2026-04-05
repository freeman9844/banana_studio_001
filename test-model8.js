const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'us-central1'
    });

    console.log("Calling model with prompt: A blue elephant riding a bicycle on the moon");
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: "A blue elephant riding a bicycle on the moon",
      config: { 
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      console.log("Image received. First 50 bytes base64:");
      console.log(response.generatedImages[0].image.imageBytes.substring(0, 50));
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
}

test();
