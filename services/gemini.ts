import { GoogleGenAI, Modality } from "@google/genai";
import { MessageRole, ChatMessage, MessageType } from "../types";

// Initialize the client with the environment API key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are Xeno AI, a friendly, bilingual AI companion (Hindi and English). 
You are helpful, warm, and slightly playful. You love using emojis 😊💫🔥.
If the user sends an image, analyze it enthusiastically.
If the user asks to generate an image, describe what you would generate in detail, but do not generate it yourself directly in text (the UI handles the actual generation call).
Support Hinglish as well.
Keep responses concise unless asked for detail.
`;

/**
 * Helper to convert base64 data URI to raw base64 string (stripping header)
 */
const cleanBase64 = (dataUri: string): string => {
  const base64Pattern = /^data:image\/(png|jpeg|webp|heic);base64,/;
  return dataUri.replace(base64Pattern, '');
};

const getMimeType = (dataUri: string): string => {
  const match = dataUri.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : 'image/jpeg';
}

/**
 * Send a message to the chat model.
 * Handles both text-only and multimodal (text + image) requests.
 */
export const sendMessageToGemini = async (
  history: ChatMessage[],
  currentMessage: string,
  currentImage?: string
): Promise<string> => {
  try {
    // Transform history for the API (excluding the current message which we pass in 'contents')
    // We only take the last few turns to keep context but avoid token limits if needed, 
    // though Gemini Flash has a large context window.
    // Note: @google/genai chat history format is strictly text mostly, but we can reconstruct it.
    // For simplicity in this stateles wrapper, we'll use generateContent with a constructed history prompt 
    // OR use the chat API if strictly text. 
    // Since we support images in history, using `generateContent` with a robust context construction is often safer/easier for mixed modality history.
    
    // However, `ai.chats.create` is great for text.
    // Let's use `generateContent` for maximum flexibility with mixed modalities in the "past".
    // We will construct a "chat" by passing previous turns as content parts if possible, 
    // but the simplest way for a single turn response with history is to format the history as a text block 
    // or use the `contents` array properly if the API supports mixed history in one go.
    
    // To keep it standard and robust:
    // We will format the conversation history into the 'contents' array.
    
    const contents = history.map(msg => ({
      role: msg.role === MessageRole.USER ? 'user' : 'model',
      parts: [
        ...(msg.imageUrl ? [{ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(msg.imageUrl) } }] : []),
        { text: msg.text }
      ]
    }));

    // Add the new message
    const newParts: any[] = [{ text: currentMessage }];
    if (currentImage) {
      newParts.unshift({
        inlineData: {
          mimeType: getMimeType(currentImage),
          data: cleanBase64(currentImage)
        }
      });
    }

    const finalContents = [
      ...contents,
      { role: 'user', parts: newParts }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I'm having trouble speaking right now.";

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error connecting to my neural link. 🧠❌";
  }
};

/**
 * Generate an image using Imagen 3
 */
export const generateImageWithGemini = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Imagen Error:", error);
    // Fallback to error handling in UI
    throw error;
  }
};

/**
 * Heuristic to determine if user wants to generate an image
 */
export const isImageGenerationRequest = (text: string): boolean => {
  const lower = text.toLowerCase();
  return (
    lower.startsWith("generate image") ||
    lower.startsWith("create image") ||
    lower.startsWith("draw") ||
    lower.startsWith("imagine") ||
    lower.includes("make an image of")
  );
};