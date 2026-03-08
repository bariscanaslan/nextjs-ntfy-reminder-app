export type JobStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";

export interface DeliveryJobPayload {
  reminderId: string;
  triggerAt: string;
  offsetMinutes?: number;
}
