export enum TranscriptionStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface Metadata {
  title: string;
  description: string;
}

export interface TranscriptionResponse {
  text: string;
  category?: string;
  metadata?: Metadata; // Novo campo para Título e Descrição
  segments: TranscriptionSegment[];
  confidence: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}