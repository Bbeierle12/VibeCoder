
import { GoogleGenAI, Chat, Content } from "@google/genai";
import { MODEL_NAME, getSystemInstruction } from '../constants';
import { Message, Role, StyleFramework } from '../types';

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing from environment variables.");
      throw new Error("API Key missing");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export const initializeChat = (
  framework: StyleFramework = 'tailwind', 
  history: Message[] = [],
  skills: string = ''
): void => {
  const ai = getAiClient();
  
  // Convert our Message type to Gemini Content type for history
  const geminiHistory: Content[] = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  chatSession = ai.chats.create({
    model: MODEL_NAME,
    history: geminiHistory,
    config: {
      systemInstruction: getSystemInstruction(framework, skills),
      temperature: 0.7,
    },
  });
};

export const sendMessageStream = async (
  content: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  // If no session exists, we initialize with defaults. 
  // Ideally, the app should call initializeChat before sending if specific settings are needed.
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  let fullResponse = "";
  
  try {
    const result = await chatSession.sendMessageStream({ message: content });
    
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        onChunk(fullResponse);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }

  return fullResponse;
};