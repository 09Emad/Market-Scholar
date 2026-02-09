import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, Shield } from "lucide-react";

export function Disclaimer() {
  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Academic & Educational Use Only
            </h3>
            <div className="space-y-1.5 text-xs text-amber-700 dark:text-amber-400/80">
              <p className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                This system is designed strictly for educational and theoretical analysis purposes as part of a graduation project at Istanbul Topkapi University.
              </p>
              <p className="flex items-start gap-1.5">
                <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                Predictions are generated using simplified models and should NOT be used for actual trading decisions. The system does not provide buy/sell recommendations.
              </p>
              <p className="flex items-start gap-1.5">
                <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                Past performance and model accuracy do not guarantee future results. Stock markets are inherently unpredictable and involve significant risk.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskLimitations() {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500" />
          Risk & Limitations
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">Data Limitations</h4>
            <p className="text-xs">
              Stock data is obtained from third-party APIs with limited update frequency. Real-time prices may have 15-20 minute delays depending on the data provider.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Model Constraints</h4>
            <p className="text-xs">
              The prediction model uses simplified LSTM-inspired analysis and sentiment scoring. It cannot account for all market variables, unexpected events, or market manipulation.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Accuracy Disclaimer</h4>
            <p className="text-xs">
              Model evaluation metrics (Accuracy, Precision, Recall, F1-Score) reflect training/testing performance and may not represent real-world predictive accuracy.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">No Financial Advice</h4>
            <p className="text-xs">
              This system is a decision support tool for academic research. It does not constitute investment advice, and the creators assume no liability for financial losses.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
