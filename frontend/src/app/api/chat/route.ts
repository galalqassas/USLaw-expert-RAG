import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use Edge Runtime for lower latency if compatible

// --- Types ---

interface MessagePart {
  text?: string;
}

interface IncomingMessage {
  role: string;
  content: string | MessagePart[];
  parts?: MessagePart[];
}

interface RequestBody {
  messages?: IncomingMessage[];
}

// --- Route ---

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Sanitize messages to ensure compatibility with backend Pydantic model
    // The backend expects: { messages: [{ role: str, content: str }] }
    const messages = body.messages?.map((m) => {
      let content = '';
      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        content = m.content.map((p) => p.text || '').join('');
      } else if (Array.isArray(m.parts)) {
        content = m.parts.map((p) => p.text || '').join('');
      } else if (m.content) {
        content = String(m.content);
      }
      return { role: m.role, content };
    }) || [];

    // Forward request to Python backend
    const response = await fetch(`${backendUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Backend error: ${errorText}` }, { status: response.status });
    }

    // Return the backend's response as a stream
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // 'Transfer-Encoding': 'chunked', // Not strictly necessary for fetch API streams, but good for clarity
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error in chat proxy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
