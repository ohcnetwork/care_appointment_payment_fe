import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { navigate } from "raviger";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast, Toaster } from "sonner";

import { scheduleServiceTypeAtom } from "@/atoms/scheduleServiceTypeAtom";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

import {
  buildInvoiceUrl,
  InvoiceIssueError,
  runInvoiceFlow,
} from "@/lib/invoiceFlow";
import { AppointmentSlotPicker } from "@/pages/Appointments/BookAppointment/AppointmentSlotPicker";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";
import { TagConfig } from "@/types/emr/tagConfig/tagConfig";
import scheduleApi from "@/types/scheduling/scheduleApi";
import { KeyboardShortcutBadge } from "@/Utils/keyboardShortcutComponents";
import { formatKeyboardShortcut } from "@/Utils/keyboardShortcutUtils";
import mutate from "@/Utils/request/mutate";

import { ScheduleResourceFormState } from "@/components/Schedule/ResourceSelector";
import { Appointment } from "@/types/scheduling/schedule";
import { AppointmentDateSelection } from "./AppointmentDateSelection";
import { AppointmentFormSection } from "./AppointmentFormSection";

/**
 * Public prop contract for `BookAppointmentDetails`. Plug overrides registered
 * against the `"BookAppointmentDetails"` key receive these exact props.
 */
export interface BookAppointmentDetailsProps {
  patientId: string;
  onSuccess?: () => void;
}

const BookAppointmentDetailsBase = ({
  patientId,
  onSuccess,
}: BookAppointmentDetailsProps) => {
  const { t } = useTranslation();

  const { facilityId } = useCurrentFacility();
  const [cachedServiceType, setCachedServiceType] = useAtom(
    scheduleServiceTypeAtom,
  );

  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [selectedTags, setSelectedTags] = useState<TagConfig[]>([]);
  const [reason, setReason] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedResource, setSelectedResource] =
    useState<ScheduleResourceFormState>({
      resource: null,
      resource_type: cachedServiceType,
    });

  useEffect(() => {
    if (
      selectedResource.resource === null &&
      selectedResource.resource_type !== cachedServiceType
    ) {
      setSelectedResource({
        resource: null,
        resource_type: cachedServiceType,
      });
    }
  }, [
    cachedServiceType,
    selectedResource.resource,
    selectedResource.resource_type,
  ]);

  const handleResourceChange = (resource: ScheduleResourceFormState) => {
    setSelectedResource(resource);
    if (resource.resource_type !== cachedServiceType) {
      setCachedServiceType(resource.resource_type);
    }
  };

  const { mutateAsync: createAppointment, isPending: isCreating } = useMutation(
    {
      mutationFn: mutate(scheduleApi.slots.createAppointment, {
        pathParams: { facilityId, slotId: selectedSlotId ?? "" },
      }),
    },
  );

  const goToAppointmentView = (appointmentId: string) => {
    navigate(
      `/facility/${facilityId}/patient/${patientId}/appointments/${appointmentId}?showSuccess=true`,
    );
  };

  /** Dropdown action: book + run the plug's auto-invoice flow. */
  const handleProceedToBilling = async () => {
    if (!selectedResource || !selectedSlotId) return;
    const data: Appointment = await createAppointment({
      patient: patientId,
      note: reason,
      tags: selectedTags.map((tag) => tag.id),
    });
    toast.success(t("appointment_created_successfully"));
    onSuccess?.();

    const inputs = {
      facilityId,
      patientId,
      appointmentId: data.id,
      isPayment: true,
    };

    try {
      const invoiceId = await runInvoiceFlow(inputs);
      if (invoiceId) {
        navigate(buildInvoiceUrl(inputs, invoiceId));
        return;
      }
    } catch (err) {
      if (err instanceof InvoiceIssueError) {
        toast.error(
          t("invoice_creation_failed", { ns: "care_appointment_plug" }),
        );
      }
      console.error(
        "[care_appointment_plug] invoice flow failed; falling back",
        err,
      );
    }

    goToAppointmentView(data.id);
  };

  const handleIsOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCurrentStep(1);
      setSelectedSlotId(undefined);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-row justify-center gap-4">
        <div className="flex w-114 flex-col gap-8 rounded-lg bg-white p-4 shadow">
          <AppointmentFormSection
            facilityId={facilityId}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            reason={reason}
            setReason={setReason}
            selectedResource={selectedResource}
            setSelectedResource={handleResourceChange}
          />
        </div>
        <div className="hidden w-full gap-6 rounded-lg bg-white p-4 shadow sm:flex sm:max-h-full sm:flex-col lg:flex-row">
          <AppointmentDateSelection
            facilityId={facilityId}
            resourceId={selectedResource.resource?.id}
            resourceType={selectedResource.resource_type}
            setSelectedDate={setSelectedDate}
            selectedDate={selectedDate}
          />
          <div className="max-h-[calc(100vh-17rem)] w-full overflow-y-auto">
            <AppointmentSlotPicker
              facilityId={facilityId}
              resourceId={selectedResource.resource?.id}
              resourceType={selectedResource.resource_type}
              selectedSlotId={selectedSlotId}
              onSlotSelect={setSelectedSlotId}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
      {selectedSlotId ? (
        <div className="mt-2 hidden p-4 shadow sm:flex">
          <div className="ml-auto flex gap-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setSelectedSlotId("");
              }}
            >
              {t("cancel")}
            </Button>
            <div className="flex">
              <Button
                variant="primary"
                size="sm"
                onClick={handleProceedToBilling}
                type="submit"
                disabled={isCreating}
                data-shortcut-id="enter-action"
              >
                {t("proceed_to_billing", { ns: "care_appointment_plug" })}
                <KeyboardShortcutBadge
                  shortcut={formatKeyboardShortcut("enter")}
                  className="ml-1"
                />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-4 p-4 shadow">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              if (window.history.length > 1) {
                // To do: construct the profile url from patientData params
                window.history.go(-2);
              } else {
                navigate(`/facility/${facilityId}/patient/${patientId}`);
              }
            }}
          >
            {t("cancel")}
          </Button>
        </div>
      )}
      <Drawer open={isOpen} onOpenChange={handleIsOpen}>
        <DrawerTrigger asChild>
          <Button
            className="mt-3 w-full sm:hidden"
            disabled={!selectedResource.resource?.id}
            onClick={() => {
              setIsOpen(true);
              setCurrentStep(1);
            }}
          >
            {t("select_date")}
            <ArrowRight size={16} />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="w-full space-y-4 p-4">
          <div className="-mx-2 flex flex-col gap-3 overflow-y-auto">
            {currentStep === 1 && (
              <>
                <AppointmentDateSelection
                  facilityId={facilityId}
                  resourceId={selectedResource.resource?.id}
                  resourceType={selectedResource.resource_type}
                  setSelectedDate={setSelectedDate}
                  selectedDate={selectedDate}
                />
                <Button
                  className="w-full"
                  disabled={!selectedDate}
                  onClick={() => setCurrentStep(2)}
                >
                  {t("select_slot")}
                  <ArrowRight size={16} />
                </Button>
              </>
            )}
          </div>

          {currentStep === 2 && (
            <>
              <AppointmentSlotPicker
                facilityId={facilityId}
                resourceId={selectedResource.resource?.id}
                resourceType={selectedResource.resource_type}
                selectedSlotId={selectedSlotId}
                onSlotSelect={setSelectedSlotId}
                selectedDate={selectedDate}
              />
              <div className="flex flex-row items-center justify-around gap-2 sm:hidden">
                <Button
                  variant="outline"
                  className="w-fit"
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedSlotId(undefined);
                  }}
                >
                  <ArrowLeft />
                  {t("back")}
                </Button>
                <div className="flex w-full">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleProceedToBilling}
                    disabled={!selectedSlotId || isCreating}
                  >
                    {t("proceed_to_billing", {
                      ns: "care_appointment_plug",
                    })}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
      <Toaster
        position="top-center"
        theme="light"
        richColors
        expand
        // For `richColors` to work, pass at-least an empty object.
        // Refer: https://github.com/shadcn-ui/ui/issues/2234.
        toastOptions={{}}
        closeButton
      />{" "}
    </div>
  );
};

/**
 * The plug's replacement for the host's `BookAppointmentDetails`. Registered
 * against the host's `"BookAppointmentDetails"` override key in
 * `src/componentOverrides.ts`.
 */
export const BookAppointmentDetails = BookAppointmentDetailsBase;
