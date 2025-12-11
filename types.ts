export enum TranscriptionStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
}
