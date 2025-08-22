export type Role = "user" | "assistant" | "consultant" | "system";

export interface ChatMessageRow {
  role: Role;
  content: string;
  created_at?: string;
}
