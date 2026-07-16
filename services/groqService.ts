
import { Message, Role, StyleFramework, GroqSettings } from '../types';
import { getSystemInstruction } from '../constants';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let currentConfig: GroqSettings | null = null;
let conversationHistory: GroqMessage[] = [];

export const GROQ_MODELS = [
  { name: 'Llama 4 Scout', value: 'meta-llama/llama-4-scout-17b-16e-instruct', description: '128K context, 17B active params, fast' },
  { name: 'Llama 4 Maverick', value: 'meta-llama/llama-4-maverick-17b-128e-instruct', description: '128K context, 17B active params, 128 experts' },
  { name: 'Llama 3.3 70B', value: 'llama-3.3-70b-versatile', description: '128K context, versatile' },
  { name: 'Llama 3.1 8B', value: 'llama-3.1-8b-instant', description: '128K context, fastest' },
  { name: 'DeepSeek R1 Distill 70B', value: 'deepseek-r1-distill-llama-70b', description: '128K context, reasoning' },
];

export const initializeGroqChat = (
  config: GroqSettings,
  framework: StyleFramework = 'tailwind',
  history: Message[] = [],
  skills: string = ''
): void => {
  currentConfig = config;

  conversationHistory = [
    {
      role: 'system',
      content: getSystemInstruction(framework, skills)
    }
  ];

  history.forEach(msg => {
    conversationHistory.push({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content: msg.content
    });
  });
};

export const sendGroqMessageStream = async (
  content: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!currentConfig) {
    throw new Error('Groq not configured. Please add your API key in settings.');
  }

  if (!currentConfig.apiKey) {
    throw new Error('Groq API key is missing. Please add it in settings.');
  }

  conversationHistory.push({
    role: 'user',
    content
  });

  let fullResponse = '';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: currentConfig.model,
        messages: conversationHistory,
        stream: true,
        max_tokens: 16384
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullResponse += deltaContent;
              onChunk(fullResponse);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    conversationHistory.push({
      role: 'assistant',
      content: fullResponse
    });

  } catch (error) {
    console.error('Groq Error:', error);
    conversationHistory.pop();
    throw error;
  }

  return fullResponse;
};

export const testGroqConnection = async (config: GroqSettings): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!config.apiKey) {
      return { success: false, error: 'API key is required' };
    }

    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Connection failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getDefaultGroqSettings = (): GroqSettings => ({
  apiKey: '',
  model: 'meta-llama/llama-4-scout-17b-16e-instruct'
});
