const { GoogleGenAI } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'jwlee-argolis-202104',
      location: 'global'
    });

    console.log("Calling gemini-3.1-flash-image-preview via generateContent on global...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: "Generate an image of a cute banana",
      config: {
        responseModalities: ["IMAGE"]
      }
    });
    
    // Log the structure of the response to see where the image is
    if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        console.log(`Found ${parts.length} parts.`);
        for (const part of parts) {
            if (part.inlineData) {
                console.log("Found image! Mime type:", part.inlineData.mimeType);
                console.log("Base64 string starts with:", part.inlineData.data.substring(0, 50));
            } else if (part.text) {
                console.log("Text part:", part.text.substring(0, 50));
            } else {
                console.log("Other part type found:", Object.keys(part));
            }
        }
    } else {
        console.log("No candidates:", response);
    }

  } catch (error) {
    console.log("Error:", error.message);
  }
}

test();
