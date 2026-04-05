const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');

async function generate() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
    location: 'us-central1'
  });

  const prompt = "A cute, simple, and colorful app icon for a magical drawing studio for elementary school kids. It features a glowing magical paintbrush or a cute animal painting. Clean solid background, 2D flat vector illustration style, bright pastel colors, UI icon design, high quality.";

  console.log("Generating icon with prompt:", prompt);
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: { 
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64Data = response.generatedImages[0].image.imageBytes;
      fs.writeFileSync("public/magic-icon.png", Buffer.from(base64Data, 'base64'));
      console.log("Icon saved to public/magic-icon.png");
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
}

generate();
