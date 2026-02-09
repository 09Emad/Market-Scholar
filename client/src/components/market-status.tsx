import { useState, useEffect } from "react";
import { getMarketStatus } from "@/lib/constants";

export function MarketStatus() {
  const [marketInfo, setMarketInfo] = useState(getMarketStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketInfo(getMarketStatus());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = {
    open: "bg-emerald-500",
    closed: "bg-red-400",
    "pre-market": "bg-amber-400",
    "after-hours": "bg-amber-400",
  }[marketInfo.status];

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${statusColor} animate-pulse`} />
      <span className="text-xs font-medium text-muted-foreground" data-testid="text-market-status">
        {marketInfo.label}
      </span>
    </div>
  );
}
