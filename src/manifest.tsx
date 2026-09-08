import { lazy } from "react";

import "./componentOverrides";

import { PatientRead } from "@/types/emr/patient/patient";
import { BookAppointmentDetails as BookAppointmentPage } from "@/pages/Appointments/BookAppointment/BookAppointmentPage";
import CreateInpatientEncounterPage from "@/pages/Encounters/CreateInpatientEncounterPage";
import EncounterExternalIdentifierSettings from "@/pages/Facility/settings/EncounterExternalIdentifierSettings";

interface NavigationLink {
  url: string;
  name: string;
  icon?: React.ReactNode;
  children?: NavigationLink[];
}

interface Manifest {
  plugin: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: Record<string, (...args: any) => React.ReactNode>;
  extends: string[];
  components: {
    PatientHomeQuickActions: React.LazyExoticComponent<
      React.FC<{
        patient: PatientRead;
        facilityId?: string;
        className?: string;
      }>
    >;
    PatientInfoCardActions: React.LazyExoticComponent<
      React.FC<{
        patient: PatientRead;
        facilityId: string;
        canWritePatient?: boolean;
      }>
    >;
    FacilityHomeActions: React.LazyExoticComponent<React.FC>;
  };
  navItems?: NavigationLink[];
  userNavItems?: NavigationLink[];
  adminNavItems?: NavigationLink[];
}

const manifest: Manifest = {
  plugin: "care_govt_hmis",
  routes: {
    "/facility/:facilityId/patient/:patientId/book-appointment": ({
      patientId,
    }) => <BookAppointmentPage patientId={patientId} />,
    "/facility/:facilityId/patient/:patientId/encounter/create": ({
      facilityId,
      patientId,
    }) => (
      <CreateInpatientEncounterPage
        facilityId={facilityId}
        patientId={patientId}
      />
    ),
    "/facility/:facilityId/settings/encounter": ({ facilityId }) => (
      <EncounterExternalIdentifierSettings facilityId={facilityId} />
    ),
  },
  extends: [],
  components: {
    PatientInfoCardActions: lazy(
      () => import("./components/Patient/PatientInfoCardActions"),
    ),
    PatientHomeQuickActions: lazy(
      () => import("@/components/Patient/PatientHomeQuickActions"),
    ),
    FacilityHomeActions: lazy(
      () => import("@/components/Facility/FacilityHomeActions"),
    ),
  },
  userNavItems: [],
  adminNavItems: [],
};

export default manifest;
