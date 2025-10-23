
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { UploadedFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const editImageWithGemini = async (
  image: UploadedFile,
  prompt: string
): Promise<string> => {
  try {
    // Gemini API requires just the base64 data, not the data URL prefix.
    const base64Data = image.base64.split(',')[1];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: image.mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Find the image part in the response
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        const newBase64Data = part.inlineData.data;
        const newMimeType = part.inlineData.mimeType;
        return `data:${newMimeType};base64,${newBase64Data}`;
      }
    }

    throw new Error("No image was generated in the API response.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        return Promise.reject(`Failed to generate image: ${error.message}`);
    }
    return Promise.reject("An unknown error occurred while generating the image.");
  }
};
