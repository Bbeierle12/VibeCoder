
import { LocalLLMConfig, Message, Role, StyleFramework } from '../types';
import { getSystemInstruction } from '../constants';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OpenAIStreamResponse {
  id: string;
  object: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

let currentConfig: LocalLLMConfig | null = null;
let conversationHistory: OllamaMessage[] = [];

export const initializeLocalChat = (
  config: LocalLLMConfig,
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

export const sendLocalMessageStream = async (
  content: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!currentConfig) {
    throw new Error('Local LLM not configured. Please configure in settings.');
  }

  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content
  });

  const endpoint = getEndpoint(currentConfig);
  let fullResponse = '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentConfig.modelName,
        messages: conversationHistory,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local LLM error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();

    // Different parsing based on provider
    if (currentConfig.provider === 'ollama') {
      // Ollama format: newline-delimited JSON
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed: OllamaResponse = JSON.parse(line);
            if (parsed.message?.content) {
              fullResponse += parsed.message.content;
              onChunk(fullResponse);
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } else {
      // OpenAI/LM Studio format: Server-Sent Events (SSE)
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6); // Remove 'data: ' prefix
              const parsed: OpenAIStreamResponse = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                fullResponse += deltaContent;
                onChunk(fullResponse);
              }
            } catch {
              // Skip invalid JSON
            }
          } else {
            // Try parsing as plain JSON (some servers don't use SSE format)
            try {
              const parsed = JSON.parse(trimmedLine);
              if (parsed.choices?.[0]?.delta?.content) {
                fullResponse += parsed.choices[0].delta.content;
                onChunk(fullResponse);
              } else if (parsed.choices?.[0]?.message?.content) {
                // Non-streaming response
                fullResponse = parsed.choices[0].message.content;
                onChunk(fullResponse);
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    }

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: fullResponse
    });

  } catch (error) {
    console.error('Local LLM Error:', error);
    // Remove the user message from history if we failed
    conversationHistory.pop();
    throw error;
  }

  return fullResponse;
};

export const testLocalConnection = async (config: LocalLLMConfig): Promise<{ success: boolean; models?: string[]; error?: string }> => {
  try {
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    
    if (config.provider === 'ollama') {
      // Test Ollama connection and get models
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      return { success: true, models };
    } else if (config.provider === 'lmstudio') {
      // LM Studio uses OpenAI-compatible API
      const response = await fetch(`${baseUrl}/v1/models`);
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }
      const data = await response.json();
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      return { success: true, models };
    } else {
      // Custom endpoint - just try to connect
      const response = await fetch(`${baseUrl}/v1/models`);
      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((m: { id: string }) => m.id) || [];
        return { success: true, models };
      }
      return { success: true, models: [] };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

function getEndpoint(config: LocalLLMConfig): string {
  const baseUrl = config.endpoint.replace(/\/+$/, '');
  
  switch (config.provider) {
    case 'ollama':
      return `${baseUrl}/api/chat`;
    case 'lmstudio':
      return `${baseUrl}/v1/chat/completions`;
    case 'custom':
    default:
      return `${baseUrl}/v1/chat/completions`;
  }
}

export const getDefaultEndpoint = (provider: 'ollama' | 'lmstudio' | 'custom'): string => {
  switch (provider) {
    case 'ollama':
      return 'http://localhost:11434';
    case 'lmstudio':
      return 'http://localhost:1234';
    case 'custom':
    default:
      return 'http://localhost:8080';
  }
};
