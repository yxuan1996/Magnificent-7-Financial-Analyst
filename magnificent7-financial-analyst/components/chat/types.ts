// Shared types for the chat interface

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  // Optional: timestamp for display
  createdAt?: Date;
}

// Suggested starter questions shown on the empty state
export const SUGGESTED_QUESTIONS = [
  "Compare NVIDIA and AMD revenue for FY2023",
  "Who is the CEO of Apple and what is their background?",
  "What were Microsoft's key acquisitions in 2023?",
  "Show me Tesla's revenue trend from 2019 to 2023",
  "What are Meta's key risks mentioned in their latest 10-K?",
  "Compare net income across all Magnificent 7 for FY2023",
];

// The seven tickers for display purposes
export const MAGNIFICENT_7 = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "META", name: "Meta" },
  { ticker: "TSLA", name: "Tesla" },
];
