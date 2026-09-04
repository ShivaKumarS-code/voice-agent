export type Role = "user" | "agent";

export interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
}

export type CallStatus = "idle" | "connecting" | "live";
