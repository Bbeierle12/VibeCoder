/**
 * Extracts the last HTML code block from a markdown string.
 * This allows for "live" updates even if the block isn't closed yet in a stream,
 * though a closed block is safer.
 */
export const extractHtmlCode = (markdown: string): string | null => {
  const codeBlockRegex = /```html([\s\S]*?)```/g;
  const matches = [...markdown.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    // Return the content of the last complete code block
    return matches[matches.length - 1][1].trim();
  }

  // Fallback for streaming: try to find an open block at the end
  const openBlockRegex = /```html([\s\S]*)$/;
  const openMatch = markdown.match(openBlockRegex);
  if (openMatch) {
    return openMatch[1].trim();
  }

  return null;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Apply theme class to document body
 */
export const applyThemeToBody = (theme: 'light' | 'dark' | 'cyberpunk'): void => {
  document.body.classList.remove('dark', 'cyberpunk');
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else if (theme === 'cyberpunk') {
    document.body.classList.add('cyberpunk');
  }
};

/**
 * Clean up draft localStorage entries for deleted sessions
 */
export const cleanupDrafts = (existingSessionIds: string[]): void => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('vibecoder_draft_')) {
      const sessionId = key.replace('vibecoder_draft_', '');
      if (!existingSessionIds.includes(sessionId)) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};
