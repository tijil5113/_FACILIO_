import { useEffect } from "react";

import { useUiStore } from "@/stores/ui-store";

export function NoticeHost() {
  const notice = useUiStore((state) => state.notice);
  const clearNotice = useUiStore((state) => state.clearNotice);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => {
      clearNotice();
    }, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [clearNotice, notice]);

  if (!notice) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <p className="rounded-[var(--facilio-radius-md)] border border-line bg-raised px-4 py-2 text-sm text-ink shadow-[var(--facilio-shadow)]">
        {notice.message}
      </p>
    </div>
  );
}
