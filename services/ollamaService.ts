
import { Message, Role, StyleFramework, OllamaSettings } from '../types';
import { getSystemInstruction } from '../constants';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let currentConfig: OllamaSettings | null = null;
let conversationHistory: OllamaMessage[] = [];

export const initializeOllamaChat = (
  config: OllamaSettings,
  framework: StyleFramework = 'tailwind',
  history: Message[] = [],
  skills: string = ''
): void => {
  currentConfig = config;
  
  // Build conversation history with system instruction
  conversationHistory = [
    {
      role: 'system',
      content: getSystemInstruction(framework, skills)
    }
  ];

  // Add existing chat history
  history.forEach(msg => {
    conversationHistory.push({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content: msg.content
    });
  });
};

export const sendOllamaMessageStream = async (
  content: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!currentConfig) {
    throw new Error('Ollama not configured. Please configure in settings.');
  }

  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content
  });

  let fullResponse = '';

  try {
    const response = await fetch(`${currentConfig.serverUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentConfig.model,
        messages: conversationHistory,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error: ${response.status} ${response.statusText} - ${errorText}`);
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
        if (!trimmedLine) continue;

        try {
          const parsed = JSON.parse(trimmedLine);
          const content = parsed.message?.content;
          if (content) {
            fullResponse += content;
            onChunk(fullResponse);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        const content = parsed.message?.content;
        if (content) {
          fullResponse += content;
          onChunk(fullResponse);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: fullResponse
    });

  } catch (error) {
    console.error('Ollama Error:', error);
    // Remove the user message from history if we failed
    conversationHistory.pop();
    throw error;
  }

  return fullResponse;
};

export const testOllamaConnection = async (config: OllamaSettings): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${config.serverUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error - Make sure Ollama is running'
    };
  }
};

export const fetchOllamaModels = async (serverUrl: string): Promise<string[]> => {
  try {
    const response = await fetch(`${serverUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return [];
  }
};

export const getDefaultOllamaSettings = (): OllamaSettings => ({
  serverUrl: 'http://localhost:11434',
  model: 'llama3.2'
});
