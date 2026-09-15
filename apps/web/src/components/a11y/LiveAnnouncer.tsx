import { useUiStore } from "@/stores/ui-store";

export function LiveAnnouncer() {
  const liveMessage = useUiStore((state) => state.liveMessage);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {liveMessage}
    </div>
  );
}
