import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { Button } from "@/components/ui/button";
import { MonetaryDisplay } from "@/components/ui/monetary-display";
import { SheetFooter } from "@/components/ui/sheet";

import {
  InvoiceCreate,
  InvoiceRead,
  InvoiceStatus,
} from "@/types/billing/invoice/invoice";
import invoiceApi from "@/types/billing/invoice/invoiceApi";
import { KeyboardShortcutBadge } from "@/Utils/keyboardShortcutComponents";
import { formatKeyboardShortcut } from "@/Utils/keyboardShortcutUtils";
import mutate from "@/Utils/request/mutate";
import { redirectToAppointmentPrintFromSourceUrl } from "./appointmentPrintRedirect";

interface InvoiceNoDuesAutoBalanceProps {
  facilityId: string;
  invoice: InvoiceRead;
  onCancel: () => void;
  onSuccess: () => void;
}

export function InvoiceNoDuesAutoBalance({
  facilityId,
  invoice,
  onCancel,
  onSuccess,
}: InvoiceNoDuesAutoBalanceProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasSubmittedRef = useRef(false);

  const { mutate: markAsBalanced, isPending } = useMutation({
    mutationFn: mutate(invoiceApi.updateInvoice, {
      pathParams: { facilityId, invoiceId: invoice.id },
    }),
    onSuccess: () => {
      toast.success(t("invoice_marked_as_balanced"));
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({
        queryKey: ["account", invoice.account.id],
      });
      if (redirectToAppointmentPrintFromSourceUrl()) {
        return;
      }
      onSuccess();
    },
    onError: () => {
      hasSubmittedRef.current = false;
      toast.error(t("failed_to_mark_invoice_as_balanced"));
    },
  });

  const handleConfirm = useCallback(() => {
    if (isPending || hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;
    const data: InvoiceCreate = {
      status: InvoiceStatus.balanced,
      payment_terms: invoice.payment_terms,
      note: invoice.note,
      account: invoice.account.id,
      charge_items: invoice.charge_items.map((item) => item.id),
      issue_date: invoice.issue_date,
    };

    markAsBalanced(data);
  }, [invoice, isPending, markAsBalanced]);

  const handleCancel = useCallback(() => {
    if (!isPending) {
      onCancel();
    }
  }, [isPending, onCancel]);

  useEffect(() => {
    hasSubmittedRef.current = false;
  }, [invoice.id]);

  return (
    <>
      <div className="space-y-6 py-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-gray-950">
                {t("invoice_has_no_dues")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">{t("invoice_total")}</span>
            <span className="font-medium text-gray-950">
              <MonetaryDisplay amount={invoice.total_gross} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">
              {t("total_payments_received")}
            </span>
            <span className="font-medium text-green-700">
              <MonetaryDisplay amount={invoice.total_payments} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3 text-sm">
            <span className="text-gray-600">{t("outstanding_balance")}</span>
            <span className="font-semibold text-gray-950">
              <MonetaryDisplay amount="0" />
            </span>
          </div>
        </div>
      </div>

      <SheetFooter className="sticky bottom-0 -mx-6 border-t border-gray-200 bg-white p-4">
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            data-shortcut-id="cancel-action"
            aria-label={t("cancel")}
          >
            {t("cancel")}
            <KeyboardShortcutBadge shortcut={formatKeyboardShortcut("esc")} />
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            data-shortcut-id="submit-action"
            aria-label={t("mark_as_balanced")}
          >
            {isPending ? (
              <>
                <CareIcon
                  icon="l-spinner"
                  className="mr-2 size-4 animate-spin"
                />
                {t("processing_with_dots")}
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                {t("mark_as_balanced")}
              </>
            )}
            <KeyboardShortcutBadge
              shortcut={formatKeyboardShortcut("shift+enter")}
            />
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
