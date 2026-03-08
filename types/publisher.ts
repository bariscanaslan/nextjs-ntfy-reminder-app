export type PublisherAuthMode = "none" | "token";

export interface PublisherInput {
  name: string;
  serverUrl: string;
  topic: string;
  authMode: PublisherAuthMode;
  token?: string;
  isDefault?: boolean;
}
