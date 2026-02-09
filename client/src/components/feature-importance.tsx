import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Layers } from "lucide-react";
import type { PredictionResult } from "@shared/schema";

interface FeatureImportanceProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
}

const COLORS = ["#1E3A8A", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"];

export function FeatureImportance({ prediction, isLoading }: FeatureImportanceProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Feature Importance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[200px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction || !prediction.featureImportance?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Feature Importance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Layers className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Feature importance appears after prediction
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedFeatures = [...prediction.featureImportance].sort(
    (a, b) => b.importance - a.importance
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Feature Importance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedFeatures.map((f) => ({
                name: f.feature,
                value: f.importance * 100,
              }))}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border border-popover-border rounded-md px-3 py-2 shadow-lg">
                      <p className="text-xs font-medium">
                        {payload[0].payload.name}: {Number(payload[0].value).toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {sortedFeatures.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 space-y-1.5">
          {sortedFeatures.map((f, i) => (
            <div
              key={f.feature}
              className="flex items-center justify-between text-xs"
              data-testid={`text-feature-${i}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{f.feature}</span>
              </div>
              <span className="font-mono font-medium">
                {(f.importance * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
