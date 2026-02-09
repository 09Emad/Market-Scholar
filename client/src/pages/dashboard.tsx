import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StockSearch } from "@/components/stock-search";
import { MarketStatus } from "@/components/market-status";
import { StockPriceCard } from "@/components/stock-price-card";
import { PriceChart } from "@/components/price-chart";
import { NewsFeed } from "@/components/news-feed";
import { PredictionCard } from "@/components/prediction-card";
import { ModelMetrics } from "@/components/model-metrics";
import { FeatureImportance } from "@/components/feature-importance";
import { PredictionHistory } from "@/components/prediction-history";
import { Disclaimer, RiskLimitations } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Brain, RefreshCw } from "lucide-react";
import type { StockQuote, NewsArticle, PredictionResult, Prediction } from "@shared/schema";

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [timeRange, setTimeRange] = useState("1m");
  const { toast } = useToast();

  const stockQuery = useQuery<StockQuote>({
    queryKey: ["/api/stock/quote", selectedSymbol],
    enabled: !!selectedSymbol,
    staleTime: 60000,
  });

  const chartQuery = useQuery<Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }>>({
    queryKey: ["/api/stock/history", selectedSymbol, timeRange],
    enabled: !!selectedSymbol,
    staleTime: 60000,
  });

  const newsQuery = useQuery<NewsArticle[]>({
    queryKey: ["/api/stock/news", selectedSymbol],
    enabled: !!selectedSymbol,
    staleTime: 120000,
  });

  const historyQuery = useQuery<Prediction[]>({
    queryKey: ["/api/predictions"],
    staleTime: 30000,
  });

  const predictionMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const res = await apiRequest("POST", "/api/stock/predict", { symbol });
      return res.json() as Promise<PredictionResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      toast({
        title: "Prediction Generated",
        description: `AI analysis complete for ${selectedSymbol}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectStock = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      predictionMutation.reset();
    },
    [predictionMutation]
  );

  const handleGeneratePrediction = useCallback(() => {
    if (selectedSymbol) {
      predictionMutation.mutate(selectedSymbol);
    }
  }, [selectedSymbol, predictionMutation]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">StockVision</h1>
            </div>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              Academic Research
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <MarketStatus />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-5">
        <div className="mb-5">
          <div className="max-w-xl">
            <StockSearch
              onSelectStock={handleSelectStock}
              currentSymbol={selectedSymbol}
            />
          </div>
        </div>

        {selectedSymbol && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="default" className="font-mono text-sm px-3 py-1">
              {selectedSymbol}
            </Badge>
            {stockQuery.data && (
              <span className="text-sm text-muted-foreground">
                {stockQuery.data.name}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                data-testid="button-generate-prediction"
                onClick={handleGeneratePrediction}
                disabled={predictionMutation.isPending || !selectedSymbol}
                size="sm"
                className="gap-2"
              >
                {predictionMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Brain className="h-3.5 w-3.5" />
                )}
                {predictionMutation.isPending ? "Analyzing..." : "Generate Prediction"}
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis & Prediction</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History & Metrics</TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about">About & Risks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <StockPriceCard
                  quote={stockQuery.data ?? null}
                  isLoading={stockQuery.isLoading && !!selectedSymbol}
                />
                <PriceChart
                  data={chartQuery.data ?? null}
                  isLoading={chartQuery.isLoading && !!selectedSymbol}
                  symbol={selectedSymbol}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </div>
              <div className="space-y-4">
                <NewsFeed
                  articles={newsQuery.data ?? null}
                  isLoading={newsQuery.isLoading && !!selectedSymbol}
                  symbol={selectedSymbol}
                />
              </div>
            </div>
            <Disclaimer />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PredictionCard
                prediction={predictionMutation.data ?? null}
                isLoading={predictionMutation.isPending}
                symbol={selectedSymbol}
              />
              <div className="space-y-4">
                <ModelMetrics
                  prediction={predictionMutation.data ?? null}
                  isLoading={predictionMutation.isPending}
                />
                <FeatureImportance
                  prediction={predictionMutation.data ?? null}
                  isLoading={predictionMutation.isPending}
                />
              </div>
            </div>
            <Disclaimer />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <PredictionHistory
              predictions={historyQuery.data ?? null}
              isLoading={historyQuery.isLoading}
            />
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <RiskLimitations />
            <Disclaimer />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-8">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground">
            <p>
              StockVision - Graduation Project | Istanbul Topkapi University | Emad Alkasabli
            </p>
            <p>
              Advisor: Dr. Aref Yelghi | Software Engineering Department | 2025-2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
