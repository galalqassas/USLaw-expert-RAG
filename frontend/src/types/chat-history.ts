/**
 * Chat History Types
 * 
 * Type definitions for the chat history feature.
 */

import { Message } from './index';

/** Represents a saved chat conversation */
export interface ChatSession {
  /** Unique identifier for the chat session */
  id: string;
  /** User-friendly title (derived from first message or auto-generated) */
  title: string;
  /** All messages in this conversation */
  messages: Message[];
  /** ISO timestamp when the chat was created */
  createdAt: string;
  /** ISO timestamp when the chat was last updated */
  updatedAt: string;
}

/** Summary of a chat for display in the sidebar (without full messages) */
export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}
