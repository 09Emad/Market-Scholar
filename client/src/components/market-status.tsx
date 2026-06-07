import { useState, useEffect } from "react";
import { getMarketStatus } from "@/lib/constants";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

export function MarketStatus() {
  const [marketInfo, setMarketInfo] = useState(getMarketStatus());
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

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

  const getStatusLabel = () => {
    switch (marketInfo.status) {
      case "open":
        return t("marketStatusOpen");
      case "closed":
        return marketInfo.label.toLowerCase().includes("weekend")
          ? t("marketStatusClosedWeekend")
          : t("marketStatusClosed");
      case "pre-market":
        return t("marketStatusPreMarket");
      case "after-hours":
        return t("marketStatusAfterHours");
      default:
        return marketInfo.label;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${statusColor} animate-pulse`} />
      <span className="text-xs font-medium text-muted-foreground" data-testid="text-market-status">
        {getStatusLabel()}
      </span>
    </div>
  );
}
