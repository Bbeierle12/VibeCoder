
import { Message, Role, StyleFramework, ClaudeSettings } from '../types';
import { getSystemInstruction } from '../constants';

interface ClaudeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let currentConfig: ClaudeSettings | null = null;
let conversationHistory: ClaudeMessage[] = [];

export const CLAUDE_MODELS = [
  { name: 'Claude Opus 4.5', value: 'opus', description: 'Most intelligent, highest quality' },
  { name: 'Claude Sonnet 4.5', value: 'sonnet', description: 'Latest balanced model' },
  { name: 'Claude Haiku 3.5', value: 'haiku', description: 'Fast and efficient' },
];

export const initializeClaudeChat = (
  config: ClaudeSettings,
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

export const sendClaudeMessageStream = async (
  content: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!currentConfig) {
    throw new Error('Claude CLI not configured. Please configure in settings.');
  }

  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content
  });

  let fullResponse = '';

  try {
    const response = await fetch(`${currentConfig.serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      throw new Error(`Claude CLI error: ${response.status} ${response.statusText} - ${errorText}`);
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

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: fullResponse
    });

  } catch (error) {
    console.error('Claude CLI Error:', error);
    // Remove the user message from history if we failed
    conversationHistory.pop();
    throw error;
  }

  return fullResponse;
};

export const testClaudeConnection = async (config: ClaudeSettings): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${config.serverUrl}/v1/models`, {
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
      error: error instanceof Error ? error.message : 'Unknown error - Make sure Claude CLI proxy is running'
    };
  }
};

export const getDefaultClaudeSettings = (): ClaudeSettings => ({
  serverUrl: 'http://localhost:3456',
  model: 'sonnet'
});
