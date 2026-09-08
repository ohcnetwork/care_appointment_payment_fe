import { GripVertical, Star, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Avatar } from "@/components/Common/Avatar";
import ValueSetSelect from "@/components/Questionnaire/ValueSetSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PractitionerSelector } from "@/pages/Appointments/components/PractitionerSelector";
import { callApi } from "@/Utils/request/query";
import { formatName } from "@/Utils/utils";
import { Code } from "@/types/base/code/code";
import facilityOrganizationApi from "@/types/facilityOrganization/facilityOrganizationApi";
import { UserReadMinimal } from "@/types/user/user";
import userApi from "@/types/user/userApi";

const DEFAULT_CARE_TEAM_ROLE: Code = {
  display: "Primary care physician",
  system: "http://snomed.info/sct",
  code: "446050000",
};

export interface SelectedCareTeamMember {
  member: UserReadMinimal;
  role: Code;
}

interface InpatientCareTeamSelectorProps {
  facilityId: string;
  value: SelectedCareTeamMember[];
  onChange: (members: SelectedCareTeamMember[]) => void;
  disabled?: boolean;
}

export function InpatientCareTeamSelector({
  facilityId,
  value,
  onChange,
  disabled,
}: InpatientCareTeamSelectorProps) {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<UserReadMinimal>();
  const [selectedRole, setSelectedRole] = useState<Code | null>(
    DEFAULT_CARE_TEAM_ROLE,
  );

  const addMember = () => {
    if (!selectedUser || !selectedRole) {
      return;
    }

    if (value.some((item) => item.member.id === selectedUser.id)) {
      toast.error(t("member_already_added"));
      return;
    }

    onChange([
      ...value,
      {
        member: selectedUser,
        role: selectedRole,
      },
    ]);
    setSelectedUser(undefined);
    setSelectedRole(DEFAULT_CARE_TEAM_ROLE);
  };

  const removeMember = (memberId: string) => {
    onChange(value.filter((item) => item.member.id !== memberId));
  };

  const makePrimary = (index: number) => {
    if (index === 0) {
      return;
    }

    const member = value[index];
    onChange([member, ...value.filter((_, itemIndex) => itemIndex !== index)]);
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2">
        <UserRound className="size-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-950">{t("care_team")}</h3>
      </div>

      <div className="space-y-3">
        <PractitionerSelector
          facilityId={facilityId}
          selected={selectedUser ? [selectedUser] : []}
          onSelect={(users) => {
            setSelectedUser(users[0]);
          }}
          multiple={false}
          defaultShowAllOrgs
          usersResolver={async ({ facilityId, organizationIds, signal }) => {
            if (organizationIds?.length) {
              const responses = await Promise.all(
                organizationIds.map((organizationId) =>
                  callApi(facilityOrganizationApi.listUsers, {
                    pathParams: { facilityId, organizationId },
                    queryParams: {
                      limit: 1000,
                      is_service_account: false,
                      user_type: "doctor",
                    },
                    signal,
                  }),
                ),
              );

              return {
                users: responses
                  .flatMap((response) =>
                    response.results.map((userRole) => userRole.user),
                  ),
              };
            }

            const response = await callApi(userApi.list, {
              queryParams: {
                user_type: "doctor",
                is_service_account: false,
                limit: 1000,
              },
              signal,
            });
            return { users: response.results };
          }}
        />
        <ValueSetSelect
          system="system-practitioner-role-code"
          value={selectedRole}
          onSelect={setSelectedRole}
          placeholder={t("select_role")}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addMember}
          disabled={!selectedUser || !selectedRole || disabled}
        >
          {t("add")}
        </Button>
      </div>

      {value.length > 0 && (
        <div className="space-y-2 pt-1">
          {value.map((item, index) => (
            <div
              key={item.member.id}
              className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2"
            >
              <GripVertical className="size-4 shrink-0 text-gray-400" />
              <Avatar
                name={formatName(item.member)}
                imageUrl={item.member.profile_picture_url}
                className="size-8"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-950">
                    {formatName(item.member)}
                  </p>
                  {index === 0 && (
                    <Badge variant="primary" className="shrink-0 font-normal">
                      {t("primary")}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {item.role.display}
                </p>
              </div>
              {index !== 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => makePrimary(index)}
                  disabled={disabled}
                  title={t("mark_as_primary")}
                >
                  <Star className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMember(item.member.id)}
                disabled={disabled}
                title={t("remove")}
              >
                <Trash2 className="size-4 text-gray-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
