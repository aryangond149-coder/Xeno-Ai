export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  imageUrl?: string; // For user uploads or generated images
  type: MessageType;
  timestamp: number;
  isGenerating?: boolean; // Loading state for this specific message
  originalPrompt?: string; // Saved prompt for regeneration
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface GenerateResponse {
  text: string;
  imageUrl?: string;
}