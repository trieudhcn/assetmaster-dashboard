import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

// Context to track composition state across dialog children
const DialogCompositionContext = React.createContext<{
  isComposing: () => boolean;
  setComposing: (composing: boolean) => void;
  justEndedComposing: () => boolean;
  markCompositionEnd: () => void;
}>({
  isComposing: () => false,
  setComposing: () => {},
  justEndedComposing: () => false,
  markCompositionEnd: () => {},
});

export const useDialogComposition = () =>
  React.useContext(DialogCompositionContext);

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const composingRef = React.useRef(false);
  const justEndedRef = React.useRef(false);
  const endTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const contextValue = React.useMemo(
    () => ({
      isComposing: () => composingRef.current,
      setComposing: (composing: boolean) => {
        composingRef.current = composing;
      },
      justEndedComposing: () => justEndedRef.current,
      markCompositionEnd: () => {
        justEndedRef.current = true;
        if (endTimerRef.current) {
          clearTimeout(endTimerRef.current);
        }
        endTimerRef.current = setTimeout(() => {
          justEndedRef.current = false;
        }, 150);
      },
    }),
    []
  );

  return (
    <DialogCompositionContext.Provider value={contextValue}>
      <DialogPrimitive.Root data-slot="dialog" {...props} />
    </DialogCompositionContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "assetmaster-overlay-motion data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]",
        className
      )}
      {...props}
    />
  );
}

DialogOverlay.displayName = "DialogOverlay";

type AssignmentRevokeConfirmation = { label: string; action: () => void };

function AssignmentRevokeConfirmationDialog({ pending, onClose }: { pending: AssignmentRevokeConfirmation | null; onClose: () => void }) {
  return <AlertDialogPrimitive.Root open={Boolean(pending)} onOpenChange={(open) => { if (!open) onClose(); }}><AlertDialogPrimitive.Portal><AlertDialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" /><AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[81] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#CDE5E5] bg-white p-5 shadow-[0_24px_70px_rgba(16,42,67,.24)]"><AlertDialogPrimitive.Title className="font-display text-lg font-extrabold text-[#102A43]">Thu hồi cấp phát Bản quyền?</AlertDialogPrimitive.Title><AlertDialogPrimitive.Description className="mt-2 text-sm leading-6 text-[#60758A]">{pending?.label || "Lượt cấp phát này"} sẽ bị thu hồi và trả lại chỗ dùng hoặc thông tin kích hoạt tương ứng.</AlertDialogPrimitive.Description><div className="mt-5 flex justify-end gap-2"><AlertDialogPrimitive.Cancel className="form-button-secondary">Hủy</AlertDialogPrimitive.Cancel><AlertDialogPrimitive.Action onClick={() => pending?.action()} className="form-button-primary bg-[#B44545] hover:bg-[#933737]">Xác nhận thu hồi</AlertDialogPrimitive.Action></div></AlertDialogPrimitive.Content></AlertDialogPrimitive.Portal></AlertDialogPrimitive.Root>;
}

function withAssignmentRevokeConfirmation(node: React.ReactNode, requestConfirmation: (confirmation: AssignmentRevokeConfirmation) => void): React.ReactNode {
  if (!React.isValidElement<{ children?: React.ReactNode; type?: string; onClick?: () => void }>(node)) return node;
  const props = node.props;
  const hasRevokeLabel = React.Children.toArray(props.children).some((child) => typeof child === "string" && child.includes("Thu hồi"));
  if (node.type === "button" && props.type === "button" && hasRevokeLabel && props.onClick) {
    return React.cloneElement(node, { onClick: () => requestConfirmation({ label: "Lượt cấp phát đang chọn", action: props.onClick! }) });
  }
  if (!props.children) return node;
  return React.cloneElement(node, undefined, React.Children.map(props.children, (child) => withAssignmentRevokeConfirmation(child, requestConfirmation)));
}

function AssignmentDialogLayout({ children }: { children: React.ReactNode }) {
  const [pendingRevoke, setPendingRevoke] = React.useState<AssignmentRevokeConfirmation | null>(null);
  const items = React.Children.toArray(children);
  const header = items.find((item) => React.isValidElement(item) && item.type === DialogHeader);
  const form = items.find((item): item is React.ReactElement<{ children?: React.ReactNode; className?: string }> => React.isValidElement(item) && item.type === "form");
  const bodyPrelude = items.filter((item) => item !== header && item !== form);

  if (!form) return <>{children}</>;

  const formItems = React.Children.toArray(form.props.children);
  const footer = formItems.find((item): item is React.ReactElement<{ children?: React.ReactNode; className?: string }> => {
    if (!React.isValidElement<{ children?: React.ReactNode; className?: string }>(item)) return false;
    return typeof item.props.className === "string" && item.props.className.includes("justify-end");
  });
  const bodyFields = formItems.filter((item) => {
    if (item === footer) return false;
    if (!React.isValidElement<{ label?: string }>(item)) return true;
    return item.props.label !== "Tên người/đối tượng giữ" && item.props.label !== "Thiết bị";
  });
  const footerChildren = React.Children.map(footer?.props.children, (control) => {
    if (!React.isValidElement<{ type?: string; className?: string; children?: React.ReactNode; "aria-busy"?: boolean }>(control) || control.type !== "button" || control.props.type !== "submit" || control.props.children !== "Đang cấp...") return control;
    return React.cloneElement(control, { className: `${control.props.className || ""} assignment-submit-loading`, "aria-busy": true }, <><span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" />Đang cấp phát…</>);
  });

  return <><AssignmentRevokeConfirmationDialog pending={pendingRevoke} onClose={() => setPendingRevoke(null)} />{header}{React.cloneElement(form, { className: "flex min-h-0 flex-1 flex-col" }, <div data-slot="dialog-body" className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">{bodyPrelude}{bodyFields.map((field) => withAssignmentRevokeConfirmation(field, setPendingRevoke))}</div>, <div data-slot="dialog-footer" className="flex justify-end gap-2 border-t border-[#E7EEF3] bg-white px-5 py-4">{footerChildren}</div>)}</>;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onEscapeKeyDown,
  onPointerDownOutside,
  ["data-licenses-services-dialog"]: licenseServiceDialog,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  "data-licenses-services-dialog"?: string;
}) {
  const { isComposing } = useDialogComposition();

  const handleEscapeKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      // Check both the native isComposing property and our context state
      // This handles Safari's timing issues with composition events
      const isCurrentlyComposing = (e as any).isComposing || isComposing();

      // If IME is composing, prevent dialog from closing
      if (isCurrentlyComposing) {
        e.preventDefault();
        return;
      }

      // Call user's onEscapeKeyDown if provided
      onEscapeKeyDown?.(e);
    },
    [isComposing, onEscapeKeyDown]
  );

  const handlePointerDownOutside = React.useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="listbox"]')) {
        event.preventDefault();
        return;
      }
      onPointerDownOutside?.(event as never);
    },
    [onPointerDownOutside]
  );

  if (licenseServiceDialog === "license" || licenseServiceDialog === "service" || licenseServiceDialog === "technology" || licenseServiceDialog === "assignment") {
    return (
      <DialogPortal data-slot="dialog-portal">
        <DialogOverlay />
        <div data-licenses-services-dialog={licenseServiceDialog} className="fixed inset-0 z-[60] grid place-items-center p-4 outline-none" onClick={(event) => { if (licenseServiceDialog !== "technology" || event.target !== event.currentTarget) return; (event.currentTarget.querySelector<HTMLElement>('[data-slot="dialog-close"]'))?.click(); }}>
          <DialogPrimitive.Content
            data-slot="dialog-content"
            className={cn("license-service-dialog-panel relative flex w-[calc(100vw-2rem)] min-h-0 flex-col overflow-hidden rounded-lg border bg-background p-0 shadow-lg", licenseServiceDialog === "assignment" ? "h-auto max-h-[calc(100dvh-2rem)] max-w-xl" : "h-[min(48rem,calc(100dvh-2rem))] max-w-3xl", licenseServiceDialog === "service" && "service-dialog-panel", licenseServiceDialog === "technology" && "technology-dialog-panel", licenseServiceDialog === "assignment" && "assignment-dialog-panel")}
            onEscapeKeyDown={handleEscapeKeyDown}
            onPointerDownOutside={handlePointerDownOutside}
            {...props}
          >
            {licenseServiceDialog === "assignment" ? <AssignmentDialogLayout>{children}</AssignmentDialogLayout> : children}
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                className="license-service-dialog-close absolute top-4 right-4 rounded-md px-2 py-1 text-xs font-extrabold text-[#527089] transition hover:bg-[#F4F7F9]"
              >
                Đóng
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "assetmaster-modal-motion bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        onEscapeKeyDown={handleEscapeKeyDown}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
};
