
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available from environment variables
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates content using the Gemini API.
 * @param {string} prompt The user prompt to send to the model.
 * @returns {Promise<string>} The generated text response.
 */
export const generateContent = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.3,
            topP: 0.95,
        }
    });

    // Use the .text property for direct text access
    const text = response.text;
    if (text) {
        return text;
    } else {
        return "The model did not return any text. Please try again.";
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred while communicating with the Gemini API: ${error.message}`;
    }
    return "An unknown error occurred while communicating with the Gemini API.";
  }
};
