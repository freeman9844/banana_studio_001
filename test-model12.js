const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'us-central1'
    });

    console.log("Calling model with prompt: A cute banana");
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: "A cute banana",
      config: { 
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      console.log("Image received. Writing to output-en.png");
      const base64Data = response.generatedImages[0].image.imageBytes;
      fs.writeFileSync("output-en.png", Buffer.from(base64Data, 'base64'));
      console.log("File saved.");
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
}

test();
