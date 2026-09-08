import { Type } from "@/Utils/request/types";
import { CareTeamRequest } from "@/types/careTeam/careTeam";
import { EncounterRead } from "@/types/emr/encounter/encounter";

export default {
  setCareTeam: {
    method: "POST",
    path: "/api/v1/encounter/{encounterId}/set_care_team_members/",
    TRes: Type<EncounterRead>(),
    TBody: Type<CareTeamRequest>(),
  },
} as const;
