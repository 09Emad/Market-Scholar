import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import type { PredictionResult } from "@shared/schema";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  symbol: string;
}

export function PredictionCard({ prediction, isLoading, symbol }: PredictionCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-24 w-full mb-4 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a stock to generate predictions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUp = prediction.direction === "up";
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Next-Day Prediction for {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div
          className={`rounded-md p-4 mb-4 ${
            isUp
              ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          }`}
          data-testid="card-prediction-result"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`p-2 rounded-md ${
                isUp
                  ? "bg-emerald-100 dark:bg-emerald-900/50"
                  : "bg-red-100 dark:bg-red-900/50"
              }`}
            >
              {isUp ? (
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold" data-testid="text-prediction-direction">
                Price Expected to Go {isUp ? "Up" : "Down"}
              </p>
              <p className="text-xs text-muted-foreground">
                Target Date: {prediction.targetDate}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium font-mono" data-testid="text-confidence-score">
                {confidencePercent}%
              </span>
            </div>
            <Progress
              value={confidencePercent}
              className={`h-2 ${
                isUp ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"
              }`}
              data-testid="progress-confidence"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-muted-foreground">Contributing Factors</h4>
          <FactorRow
            label="Technical Score"
            value={`${(prediction.factors.technicalScore * 100).toFixed(0)}%`}
            testId="text-technical-score"
          />
          <FactorRow
            label="Sentiment Score"
            value={`${(prediction.factors.sentimentScore * 100).toFixed(0)}%`}
            testId="text-sentiment-score"
          />
          <FactorRow
            label="Volume Signal"
            value={prediction.factors.volumeSignal}
            testId="text-volume-signal"
          />
          <FactorRow
            label="Price Action"
            value={prediction.factors.priceAction}
            testId="text-price-action"
          />
          <FactorRow
            label="News Impact"
            value={prediction.factors.newsImpact}
            testId="text-news-impact"
          />
        </div>

        <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              This prediction is for educational purposes only. It does not constitute financial advice or a recommendation to buy/sell securities.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FactorRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono text-xs" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
