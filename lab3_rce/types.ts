
export interface CodeFile {
  id: string;
  name: string;
  language: string;
  code: string;
}

export interface PromptSuggestion {
    id: string;
    title: string;
    description: string;
    fullPromptGenerator: (files: CodeFile[]) => string;
}

export interface ChatMessage {
    sender: 'user' | 'gemini' | 'system';
    text: string;
}
