import { navigate } from "raviger";

const APPOINTMENT_SOURCE_URL_PATTERN =
  /^\/facility\/[^/]+\/patient\/[^/]+\/appointments\/[^/?#]+\/?$/;

interface AppointmentPrintRedirectDecision {
  currentPath?: string;
  sourceUrl?: string;
  printUrl?: string;
  reason:
    | "browser_unavailable"
    | "missing_source_url"
    | "not_appointment_source_url"
    | "appointment_source_url";
}

export const getAppointmentPrintRedirectDecision =
  (): AppointmentPrintRedirectDecision => {
    if (typeof window === "undefined") {
      return { reason: "browser_unavailable" };
    }

    const searchParams = new URLSearchParams(window.location.search);
    const sourceUrl =
      searchParams.get("sourceUrl") ?? searchParams.get("source_url");
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (!sourceUrl) {
      return {
        currentPath,
        reason: "missing_source_url",
      };
    }

    if (!APPOINTMENT_SOURCE_URL_PATTERN.test(sourceUrl)) {
      return {
        currentPath,
        sourceUrl,
        reason: "not_appointment_source_url",
      };
    }

    return {
      currentPath,
      sourceUrl,
      printUrl: `${sourceUrl.replace(/\/$/, "")}/print`,
      reason: "appointment_source_url",
    };
  };

export function redirectToAppointmentPrintFromSourceUrl() {
  const appointmentPrintRedirect = getAppointmentPrintRedirectDecision();
  console.log(
    "[care_appointment_plug] appointment print redirect check",
    appointmentPrintRedirect,
  );

  if (!appointmentPrintRedirect.printUrl) {
    console.log("[care_appointment_plug] no appointment print redirect", {
      reason: appointmentPrintRedirect.reason,
      sourceUrl: appointmentPrintRedirect.sourceUrl,
    });
    return false;
  }

  const invoiceUrl = `${window.location.pathname.replace(/\/pay$/, "")}${window.location.search}`;
  window.history.replaceState(window.history.state, "", invoiceUrl);
  console.log("[care_appointment_plug] redirecting to appointment print", {
    sourceUrl: appointmentPrintRedirect.sourceUrl,
    invoiceUrl,
    printUrl: appointmentPrintRedirect.printUrl,
  });
  navigate(appointmentPrintRedirect.printUrl);
  return true;
}
