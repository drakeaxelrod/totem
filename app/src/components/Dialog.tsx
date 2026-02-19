import { useEffect, useCallback, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { JSX } from "preact";
import { createPortal } from "preact/compat";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
  width?: number;
  height?: string;
}

export function Dialog({ open, onClose, children, width = 960, height = "60vh" }: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Set dimensions via JS after mount (CSS width doesn't work in WebKitGTK)
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    el.style.width = `${width}px`;
    el.style.maxWidth = "calc(100vw - 32px)";
    el.style.height = height;
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.background = "#313244";
    el.style.borderRadius = "12px";
    el.style.overflow = "hidden";
  }, [open, width, height]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return createPortal(
    <div
      style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center"
      onClick={handleBackdropClick}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
