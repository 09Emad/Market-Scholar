import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Target, Gauge } from "lucide-react";
import type { PredictionResult } from "@shared/schema";

interface ModelMetricsProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
}

export function ModelMetrics({ prediction, isLoading }: ModelMetricsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Model Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
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
            <Target className="h-4 w-4" />
            Model Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Gauge className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Metrics appear after generating a prediction
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = prediction.modelMetrics;

  const metricsList = [
    { label: "Accuracy", value: metrics.accuracy, color: "#3B82F6" },
    { label: "Precision", value: metrics.precision, color: "#10B981" },
    { label: "Recall", value: metrics.recall, color: "#F59E0B" },
    { label: "F1-Score", value: metrics.f1Score, color: "#8B5CF6" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Model Evaluation Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {metricsList.map((m) => (
            <div
              key={m.label}
              className="p-3 rounded-md bg-muted/40"
              data-testid={`card-metric-${m.label.toLowerCase()}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className="text-sm font-bold font-mono" style={{ color: m.color }}>
                  {(m.value * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={m.value * 100}
                className="h-1.5"
                style={{ ["--progress-color" as string]: m.color }}
              />
            </div>
          ))}
        </div>

        <div className="p-3 rounded-md bg-muted/40">
          <p className="text-xs text-muted-foreground mb-2">Metrics Comparison</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metricsList.map((m) => ({
                  name: m.label,
                  value: m.value * 100,
                  color: m.color,
                }))}
                margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-popover-border rounded-md px-3 py-2 shadow-lg">
                        <p className="text-xs font-medium">
                          {payload[0].payload.name}: {payload[0].value?.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {metricsList.map((m, i) => (
                    <Cell key={i} fill={m.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
