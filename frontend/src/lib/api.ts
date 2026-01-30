import { Message, RetrievedChunk, MetricsData, FileType } from '@/types';
import { config } from './config';

// --- Types ---

interface BackendSource {
  rank: number;
  score: number | null;
  file_path: string;
  text: string;
  text_length: number;
}

interface BackendQueryResponse {
  answer: string;
  sources: BackendSource[];
}

export interface QueryResult {
  answer: string;
  chunks: RetrievedChunk[];
  metrics: MetricsData;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isNetworkError = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Helpers ---

const getFileType = (path: string): FileType => {
  if (path.endsWith('.pdf')) return 'pdf';
  if (path.endsWith('.docx') || path.endsWith('.doc')) return 'docx';
  return 'web';
};

const mapSourcesToChunks = (sources: BackendSource[]): RetrievedChunk[] =>
  sources.map((src, i) => ({
    id: `chunk-${i}-${Date.now()}`,
    title: src.file_path.split(/[/\\]/).pop() || 'Unknown',
    type: getFileType(src.file_path),
    snippet: src.text,
    relevance: src.score ? Math.round(src.score * 100) : 0,
    sourceUrl: src.file_path,
  }));

// --- API Client ---

export async function sendQuery(messages: Message[]): Promise<QueryResult> {
  const start = performance.now();

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
    });
  } catch {
    throw new ApiError(
      'Cannot connect to the server.',
      undefined,
      true
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new ApiError(`Server error: ${errorText}`, response.status);
  }

  const data: BackendQueryResponse = await response.json();
  const totalTime = performance.now() - start;

  return {
    answer: data.answer,
    chunks: mapSourcesToChunks(data.sources),
    metrics: {
      retrievalTimeMs: Math.round(totalTime * 0.3),
      synthesisTimeMs: Math.round(totalTime * 0.7),
    },
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${config.apiBaseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
