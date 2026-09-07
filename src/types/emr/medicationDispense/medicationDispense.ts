/**
 * Structural subset of the host's
 * `types/emr/medicationDispense/medicationDispense`.
 *
 * Only the fields this plug reads are declared — the host passes the full
 * object through at runtime.
 */
import { ChargeItemRead } from "@/types/billing/chargeItem/chargeItem";

export enum MedicationDispenseStatus {
  preparation = "preparation",
  in_progress = "in_progress",
  cancelled = "cancelled",
  on_hold = "on_hold",
  completed = "completed",
  entered_in_error = "entered_in_error",
  stopped = "stopped",
  declined = "declined",
}

export const MEDICATION_DISPENSE_CANCELLED_STATUSES: MedicationDispenseStatus[] =
  [
    MedicationDispenseStatus.cancelled,
    MedicationDispenseStatus.entered_in_error,
    MedicationDispenseStatus.stopped,
    MedicationDispenseStatus.declined,
  ];

export interface MedicationDispenseRead {
  id: string;
  status: MedicationDispenseStatus;
  charge_item?: ChargeItemRead;
}
