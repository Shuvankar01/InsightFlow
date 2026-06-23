import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function RealtimeStatus() {
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  useEffect(() => {
    const channel = supabase
      .channel("realtime-status-probe")
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CLOSED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("offline");
        else setStatus("connecting");
      });

    const onOnline = () => setStatus((p) => (p === "offline" ? "connecting" : p));
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Offline";
  const dot =
    status === "live" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500" : "bg-muted-foreground";

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground sm:inline-flex"
      title={`Realtime ${label}`}
    >
      <span className="relative flex h-2 w-2">
        {status === "live" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dot)} />
      </span>
      <span className="font-medium text-foreground/80">{label}</span>
    </div>
  );
}
