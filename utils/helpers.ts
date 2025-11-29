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
