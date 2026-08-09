import React from "react";

export function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

type StatusType = "draft" | "pending" | "payment" | "success" | "shipped";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
}

export function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  
  const statusStyles: Record<StatusType, string> = {
    draft: "bg-status-draft-bg text-status-draft",
    pending: "bg-status-pending-bg text-status-pending",
    payment: "bg-status-payment-bg text-status-payment",
    success: "bg-status-success-bg text-status-success",
    shipped: "bg-status-shipped-bg text-status-shipped",
  };

  const statusLabels: Record<StatusType, string> = {
    draft: "پیشنویس / لغو",
    pending: "در انتظار بررسی",
    payment: "در انتظار پرداخت",
    success: "پرداخت شده",
    shipped: "ارسال شده",
  };

  return (
    <div className={classNames(baseStyles, statusStyles[status], className)} {...props}>
      {children || statusLabels[status]}
    </div>
  );
}
