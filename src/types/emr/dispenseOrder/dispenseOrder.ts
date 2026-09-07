/**
 * Structural subset of the host's `types/emr/dispenseOrder/dispenseOrder`.
 *
 * Only the fields this plug reads are declared — the host passes the full
 * object through at runtime.
 */
import { PatientRead } from "@/types/emr/patient/patient";

export enum DispenseOrderStatus {
  draft = "draft",
  in_progress = "in_progress",
  completed = "completed",
  abandoned = "abandoned",
  entered_in_error = "entered_in_error",
}

export interface DispenseOrderRead {
  id: string;
  status: DispenseOrderStatus;
  name?: string;
  note?: string;
  patient: PatientRead;
}
