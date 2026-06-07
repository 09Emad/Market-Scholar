import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, Shield } from "lucide-react";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

export function Disclaimer() {
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t("academicUseOnly")}
            </h3>
            <div className="space-y-1.5 text-xs text-amber-700 dark:text-amber-400/80">
              <p className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                {t("disclaimerThesis")}
              </p>
              <p className="flex items-start gap-1.5">
                <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                {t("disclaimerAccuracy")}
              </p>
              <p className="flex items-start gap-1.5">
                <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                {t("disclaimerPastPerformance")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskLimitations() {
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500" />
          {t("riskLimitations")}
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">{t("dataLimitations")}</h4>
            <p className="text-xs">
              {t("dataLimitationsDesc")}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">{t("modelConstraints")}</h4>
            <p className="text-xs">
              {t("modelConstraintsDesc")}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">{t("accuracyDisclaimer")}</h4>
            <p className="text-xs">
              {t("accuracyDisclaimerDesc")}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">{t("noFinancialAdvice")}</h4>
            <p className="text-xs">
              {t("noFinancialAdviceDesc")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
