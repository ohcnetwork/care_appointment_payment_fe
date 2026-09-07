import {
  ArrowLeftRight,
  ChevronDown,
  PauseCircle,
  WrenchIcon,
} from "lucide-react";
import { navigate } from "raviger";
import { ComponentType, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { extractInvoicesFromDispenses } from "@/pages/Facility/services/pharmacy/utils/extractInvoicesFromDispenses";

import { EXCLUDED_CHARGE_ITEM_STATUSES } from "@/types/billing/chargeItem/chargeItem";
import { InvoiceRead, InvoiceStatus } from "@/types/billing/invoice/invoice";
import {
  DispenseOrderRead,
  DispenseOrderStatus,
} from "@/types/emr/dispenseOrder/dispenseOrder";
import {
  MEDICATION_DISPENSE_CANCELLED_STATUSES,
  MedicationDispenseRead,
  MedicationDispenseStatus,
} from "@/types/emr/medicationDispense/medicationDispense";

import { decimal } from "@/Utils/decimal";

interface Props {
  facilityId: string;
  locationId: string;
  dispenseOrder: DispenseOrderRead;
  /** Every dispense of the order, including cancelled ones. */
  dispenses: MedicationDispenseRead[];
  hasNonCancelledDispenses: boolean;
  updateStatus: (
    args: { newStatus: DispenseOrderStatus },
    options?: { onSuccess?: () => void },
  ) => void;
  isUpdatingStatus: boolean;
}

/** An invoice nobody owes anything on — nothing left to collect. */
const hasNoAmountDue = (invoice: InvoiceRead) =>
  decimal(invoice.total_gross || 0).lessThanOrEqualTo(0);

/**
 * Sticky action bar of the dispense order view.
 *
 * This plug only relaxes the completion gate of the *open* order bar, so
 * every other order state is delegated back to the host's own footer.
 */
export function DispenseOrderViewFooter({
  __base: Base,
  ...props
}: Props & { __base?: ComponentType<Props> }) {
  const isOrderOpen =
    props.dispenseOrder.status === DispenseOrderStatus.draft ||
    props.dispenseOrder.status === DispenseOrderStatus.in_progress;

  if (!isOrderOpen) {
    return Base ? <Base {...props} /> : null;
  }

  return <OpenDispenseOrderFooter {...props} />;
}

/**
 * Action bar for a draft / in-progress dispense order, along with the
 * confirmation dialogs its actions open.
 *
 * Same as the host's, except a billable item also counts as settled when its
 * invoice has no amount due — a zero-value invoice never gets marked
 * `balanced`, yet there is nothing left to collect on it.
 */
function OpenDispenseOrderFooter({
  facilityId,
  locationId,
  dispenseOrder,
  dispenses,
  updateStatus,
  isUpdatingStatus,
}: Props) {
  const { t } = useTranslation();

  const [putOnHoldDialogOpen, setPutOnHoldDialogOpen] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] =
    useState<DispenseOrderStatus | null>(null);

  const invoices = useMemo(
    () => extractInvoicesFromDispenses(dispenses),
    [dispenses],
  );

  const hasBalancedInvoice = invoices.some(
    (inv) => inv.status === InvoiceStatus.balanced,
  );

  // Cancelling the dispense order (abandoned / entered_in_error) is blocked
  // while an issued/balanced invoice exists.
  const blockingInvoice = invoices.find(
    (inv) =>
      inv.status === InvoiceStatus.issued ||
      inv.status === InvoiceStatus.balanced,
  );

  // Completion is allowed only when every billable item is either excluded
  // (not_billable / aborted / entered_in_error) or settled — settled meaning
  // its invoice is balanced, or the invoice has no amount due at all.
  // Cancelled dispenses don't require settlement.
  const canCompleteDispense = useMemo(
    () =>
      dispenses.every((dispense) => {
        if (MEDICATION_DISPENSE_CANCELLED_STATUSES.includes(dispense.status)) {
          return true;
        }
        const ci = dispense.charge_item;
        if (!ci) return true;
        if (EXCLUDED_CHARGE_ITEM_STATUSES.includes(ci.status)) return true;
        const invoice = ci.paid_invoice;
        if (!invoice) return false;
        return (
          invoice.status === InvoiceStatus.balanced || hasNoAmountDue(invoice)
        );
      }),
    [dispenses],
  );

  // Nothing was ever payable on this order, so the completion gate opened
  // without any money changing hands.
  const nothingWasPayable =
    invoices.length > 0 && invoices.every(hasNoAmountDue);

  // True when one or more non-finalized dispenses are currently on hold.
  const hasOnHoldDispenses = useMemo(
    () => dispenses.some((d) => d.status === MedicationDispenseStatus.on_hold),
    [dispenses],
  );

  const handlePutOnHold = () => {
    updateStatus(
      { newStatus: DispenseOrderStatus.draft },
      {
        onSuccess: () => {
          setPutOnHoldDialogOpen(false);
          navigate(
            `/facility/${facilityId}/locations/${locationId}/medication_requests`,
          );
        },
      },
    );
  };

  const handleResumePreparation = () => {
    updateStatus({ newStatus: DispenseOrderStatus.in_progress });
  };

  const cancelStatusOptions = [
    DispenseOrderStatus.entered_in_error,
    DispenseOrderStatus.abandoned,
  ].filter((s) => s !== dispenseOrder.status);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 md:px-6 py-4 bg-white border-t border-gray-200 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-3.5 text-sm text-gray-700">
          {canCompleteDispense ? (
            <>
              <span className="font-medium">
                {nothingWasPayable
                  ? t("no_payment_due_for_dispense")
                  : t("payment_has_been_collected")}
              </span>{" "}
              <span className="text-red-600 font-medium">
                {t("complete_dispense_to_proceed")}
              </span>
            </>
          ) : (
            <span className="text-red-600 font-medium italic">
              {t("settle_invoices_with_amount_due_before_completion")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasOnHoldDispenses ? (
            <Button
              variant="outline"
              onClick={handleResumePreparation}
              disabled={isUpdatingStatus || hasBalancedInvoice}
              title={
                hasBalancedInvoice
                  ? t("put_on_hold_disabled_balanced_invoice")
                  : undefined
              }
            >
              <WrenchIcon className="size-4" />
              {t("put_in_preparation")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setPutOnHoldDialogOpen(true)}
              disabled={isUpdatingStatus || hasBalancedInvoice}
              title={
                hasBalancedInvoice
                  ? t("put_on_hold_disabled_balanced_invoice")
                  : undefined
              }
            >
              <PauseCircle className="size-4" />
              {t("put_on_hold")}
            </Button>
          )}
          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant={
                      canCompleteDispense ? "primary" : "outline_primary"
                    }
                    className="rounded-r-none"
                    onClick={() =>
                      updateStatus({
                        newStatus: DispenseOrderStatus.completed,
                      })
                    }
                    disabled={isUpdatingStatus || !canCompleteDispense}
                    // Badge omitted: the host owns the shortcut registry and a
                    // plug renders outside its provider.
                    data-shortcut-id="dispense-button"
                  >
                    {t("complete_dispense")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCompleteDispense && (
                <TooltipContent>
                  {t("settle_invoices_with_amount_due_before_completion")}
                </TooltipContent>
              )}
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={canCompleteDispense ? "primary" : "outline_primary"}
                  size="icon"
                  className="rounded-l-none border-l border-l-white/20"
                  disabled={isUpdatingStatus}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cancelStatusOptions.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setConfirmStatusChange(s)}
                    disabled={isUpdatingStatus}
                  >
                    {t(`mark_as_${s}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Put on hold confirmation */}
      <AlertDialog
        open={putOnHoldDialogOpen}
        onOpenChange={setPutOnHoldDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("put_dispense_on_hold")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("put_on_hold_confirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              {t("stay_on_this_page")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePutOnHold();
              }}
              disabled={isUpdatingStatus}
            >
              <ArrowLeftRight className="size-4" />
              {t("put_on_hold")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status change confirmation (entered_in_error / abandoned) */}
      <AlertDialog
        open={!!confirmStatusChange}
        onOpenChange={(open) => !open && setConfirmStatusChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatusChange ? t(`mark_as_${confirmStatusChange}`) : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockingInvoice
                ? t("dispense_order_cannot_be_cancelled_due_to_invoice", {
                    invoiceNumber: blockingInvoice.number,
                    status: t(`invoice_status__${blockingInvoice.status}`),
                  })
                : confirmStatusChange === DispenseOrderStatus.entered_in_error
                  ? t("mark_order_as_entered_in_error_confirmation_description")
                  : t("mark_order_as_abandoned_confirmation_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              {blockingInvoice ? t("close") : t("cancel")}
            </AlertDialogCancel>
            {!blockingInvoice && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (!confirmStatusChange) return;
                  updateStatus(
                    { newStatus: confirmStatusChange },
                    {
                      onSuccess: () => {
                        setConfirmStatusChange(null);
                      },
                    },
                  );
                }}
                disabled={isUpdatingStatus}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t("confirm")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
