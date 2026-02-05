// Types for the RAG chatbot application

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, unknown>[]; // Vercel AI SDK data parts
  timestamp?: Date;
}

export type FileType = 'pdf' | 'docx' | 'web';

export interface RetrievedChunk {
  id: string;
  title: string;
  type: FileType;
  snippet: string;
  relevance: number;
  sourceUrl?: string;
}

export interface MetricsData {
  retrievalTimeMs: number;
  synthesisTimeMs: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface RetrievalState {
  chunks: RetrievedChunk[];
  metrics: MetricsData;
  isLoading: boolean;
}
