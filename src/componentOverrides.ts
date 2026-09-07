/**
 * Component overrides this plug contributes to the host.
 *
 * Each key here is a host component identifier (see the host's
 * `src/lib/override/keys` registry). The value is the forked implementation
 * the host should render in place of its own.
 *
 * Imported for side-effects from `manifest.tsx`.
 */
import { BookAppointmentDetails } from "@/pages/Appointments/BookAppointment/BookAppointmentDetails";
import { PaymentReconciliationSheet } from "@/pages/Facility/billing/PaymentReconciliationSheet";
import { DispenseOrderViewFooter } from "@/pages/Facility/services/pharmacy/components/DispenseOrderViewFooter";
import { defineComponentOverrides } from "@/lib/hostOverrides";
import { PrintInvoice } from "@/components/Billing/PrintInvoice";

defineComponentOverrides({
  PrintInvoice: {
    component: PrintInvoice,
    description:
      "Shows service request origin and category on charge item titles for Invoice Print.",
  },
  BookAppointmentDetails: {
    component: BookAppointmentDetails,
    description:
      "Auto-creates and issues an invoice on appointment confirmation when the appointment has charge items.",
    // Scope to the two routes that mount `BookAppointmentSheet` today:
    //   - PatientHome:    /facility/:facilityId/patients/home
    //   - PatientProfile: /patient/:id[/:tab]
    //                     /facility/:facilityId/patient/:id[/:tab]
    // Anywhere else, the override is skipped and the host's base
    // component renders.
    condition: {
      custom: ({ route }) =>
        typeof route === "string" &&
        /^(\/facility\/[^/]+)?\/patient(s\/home|\/[^/]+)/.test(route),
    },
  },
  PaymentReconciliationSheet: {
    component: PaymentReconciliationSheet,
    description:
      "Overrides the host's PaymentReconciliationSheet with a version that supports reconciling payments for appointments.",
    // Scope to the route that mounts `PaymentReconciliationSheet` today:
    //   - FacilityBilling: /facility/:facilityId/billing/reconcile-payments
    // Anywhere else, the override is skipped and the host's base
    // component renders.
    // condition: {
    //   custom: ({ route }) =>
    //     typeof route === "string" &&
    //     /^\/facility\/[^/]+\/billing\/invoices\/[^/]+\/pay\?sourceUrl=[^/]+appointment[^/]+/.test(
    //       route,
    //     ),
    // },
  },
  DispenseOrderViewFooter: {
    component: DispenseOrderViewFooter,
    description:
      "Also allows completing a dispense when the invoice has no amount due, not just when it is balanced.",
  },
});
