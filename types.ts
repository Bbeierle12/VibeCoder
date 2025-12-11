
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface CodeVersion {
  id: string;
  code: string;
  timestamp: number;
  description?: string;
}

export interface Skill {
  id: string;
  name: string;
  content: string;
  isEnabled: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  isCustom?: boolean;
}

export type StyleFramework = 'tailwind' | 'material-ui' | 'chakra-ui' | 'bootstrap';

export type Theme = 'light' | 'dark' | 'cyberpunk';

export interface ClaudeSettings {
  serverUrl: string;
  model: 'opus' | 'sonnet' | 'haiku';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  codeVersions: CodeVersion[];
  currentVersionIndex: number;
  createdAt: number;
  lastModified: number;
  framework: StyleFramework;
  testCode?: string;
}

export interface ChatState {
  messages: Message[];
  isThinking: boolean;
  currentCode: string | null;
}

export type CodeUpdateCallback = (code: string) => void;
