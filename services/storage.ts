
import { User, ChatSession, Skill, Theme, ProjectTemplate } from '../types';
import { DEFAULT_TEST_CODE, DEFAULT_PROJECT_TEMPLATES } from '../constants';

const STORAGE_KEYS = {
  USER: 'vibecoder_user',
  SESSIONS: 'vibecoder_sessions',
  SKILLS: 'vibecoder_skills',
  THEME: 'vibecoder_theme',
  TEMPLATES: 'vibecoder_templates'
};

const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'default-1',
    name: 'Clean Code',
    content: 'Ensure all code is clean, well-commented, and follows best practices for maintainability.',
    isEnabled: true
  },
  {
    id: 'default-2',
    name: 'Accessibility',
    content: 'All generated UI components must be accessible (ARIA attributes, proper contrast, keyboard navigation).',
    isEnabled: false
  }
];

export const storage = {
  getUser: (): User | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  clearUser: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getSessions: (): ChatSession[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      // Migration: Ensure framework and testCode properties exist
      return parsed.map((session: any) => ({
        ...session,
        framework: session.framework || 'tailwind',
        testCode: session.testCode || DEFAULT_TEST_CODE
      }));
    } catch (e) {
      return [];
    }
  },

  saveSession: (session: ChatSession) => {
    const sessions = storage.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    
    // Sort by last modified (newest first)
    sessions.sort((a, b) => b.lastModified - a.lastModified);
    
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  deleteSession: (id: string) => {
    const sessions = storage.getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getSkills: (): Skill[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SKILLS);
      return data ? JSON.parse(data) : DEFAULT_SKILLS;
    } catch (e) {
      return DEFAULT_SKILLS;
    }
  },

  saveSkills: (skills: Skill[]) => {
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
  },

  getTheme: (): Theme => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.THEME);
      return (data === 'light' || data === 'dark') ? data : 'dark';
    } catch (e) {
      return 'dark';
    }
  },

  saveTheme: (theme: Theme) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getTemplates: (): ProjectTemplate[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      return data ? JSON.parse(data) : DEFAULT_PROJECT_TEMPLATES;
    } catch (e) {
      return DEFAULT_PROJECT_TEMPLATES;
    }
  },

  saveTemplates: (templates: ProjectTemplate[]) => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }
};
