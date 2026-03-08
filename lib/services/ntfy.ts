import { decryptSecret } from "@/lib/utils/crypto";
import { PublisherModel } from "@/lib/models";

export interface NtfyMessage {
  title: string;
  message: string;
  priority?: number;
  /** ntfy emoji shortcode tags, e.g. ["bell", "warning"] */
  tags?: string[];
  click?: string;
  markdown?: boolean;
}

function normalizeServerUrl(serverUrl: string) {
  return serverUrl.replace(/\/$/, "");
}

/**
 * Publishes to ntfy using the HTTP-header API (plain-text body).
 * This is the most compatible approach across all ntfy server versions and clients —
 * the same method Uptime Kuma and other tools use.
 */
export async function publishToNtfy(publisherId: string, payload: NtfyMessage) {
  const publisher = await PublisherModel.findById(publisherId);
  if (!publisher) {
    throw new Error("Publisher not found");
  }

  const url = `${normalizeServerUrl(publisher.serverUrl)}/${publisher.topic}`;

  // HTTP header values must be ASCII. Strip any non-ASCII characters (emoji, etc.)
  // from the title to avoid Node.js fetch throwing a TypeError.
  // Emoji and rich text belong in the message body, not headers.
  const safeTitle = payload.title.replace(/[^\x20-\x7E]/g, "").trim() || payload.title.slice(0, 80);

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Title": safeTitle,
    "X-Priority": String(payload.priority ?? 3)
  };

  if (payload.tags?.length) {
    headers["X-Tags"] = payload.tags.join(",");
  }

  if (payload.click) {
    // Use an action button instead of X-Click so the user must explicitly tap
    // "Open link" — the notification itself does NOT auto-redirect on open.
    headers["X-Actions"] = `view, Open link, ${payload.click}`;
  }

  if (payload.markdown) {
    headers["X-Markdown"] = "1";
  }

  if (publisher.authMode === "token") {
    if (!publisher.encryptedToken) {
      throw new Error("Publisher token is missing");
    }
    headers.Authorization = `Bearer ${decryptSecret(publisher.encryptedToken)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: payload.message
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ntfy publish failed (${response.status}): ${text}`);
  }

  return response.text();
}
