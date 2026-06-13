import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getMarketStatus } from "@/lib/constants";
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
import { TickerBar } from "@/components/ticker-bar";
import { Watchlist } from "@/components/watchlist";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIChatAssistant } from "@/components/ai-chat-assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Brain, RefreshCw } from "lucide-react";
import type { StockQuote, NewsArticle, PredictionResult, Prediction } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTheme } from "@/components/theme-toggle";
import { LogOut, Sun, Moon, Settings, X } from "lucide-react";
import { translations } from "@/lib/translations";
import { SettingsDialog } from "@/components/settings-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggle: toggleTheme, language } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [timeRange, setTimeRange] = useState("1d");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const [marketActive, setMarketActive] = useState(() => {
    const s = getMarketStatus().status;
    return s === "open" || s === "pre-market" || s === "after-hours";
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const s = getMarketStatus().status;
      setMarketActive(s === "open" || s === "pre-market" || s === "after-hours");
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const isMarketActive = marketActive;
  const priceRefreshInterval = isMarketActive ? 30000 : false;
  const chartRefreshInterval = isMarketActive && timeRange === "1d" ? 30000 : false;

  const stockQuery = useQuery<StockQuote>({
    queryKey: ["/api/stock/quote", selectedSymbol],
    enabled: !!selectedSymbol,
    staleTime: 15000,
    refetchInterval: priceRefreshInterval,
  });

  const chartQuery = useQuery<Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }>>({
    queryKey: ["/api/stock/history", selectedSymbol, timeRange],
    enabled: !!selectedSymbol,
    staleTime: 15000,
    refetchInterval: chartRefreshInterval,
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

useEffect(() => {
    // وظيفة بسيطة فقط لتحديث البيانات الموجودة مسبقاً
    const refreshData = () => {
        // هنا نخبر React Query أن تعيد جلب البيانات بطلب GET بسيط
        // هذا الطلب سيخبر السيرفر "أنا موجود" لتفعيل الـ Flag الذكي
        queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
    };

    // تحديث الشاشة كل 30 ثانية
    const interval = setInterval(refreshData, 30000);
    
    return () => clearInterval(interval);
}, [queryClient]);

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
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate AI predictions and run LSTM models.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    if (selectedSymbol) {
      predictionMutation.mutate(selectedSymbol);
    }
  }, [selectedSymbol, predictionMutation, user, setLocation, toast]);

  return (
    <div className="min-h-screen bg-background">
      <TickerBar onSelectStock={handleSelectStock} />

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="StockVision" className="h-7 w-7 rounded-lg shadow-sm" />
              <h1 className="text-lg font-bold tracking-tight">StockVision</h1>
            </div>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              {t("academicResearch")}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <MarketStatus />
            {user ? (
              <div className="border-l pl-3 ml-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 border border-border/50 hover:bg-muted transition-all duration-200 active:scale-95">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                          {user.username.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal py-2 px-3">
                      <div className="flex flex-col space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("accountInfo")}</span>
                        <span className="text-sm font-bold text-foreground truncate">{user.username}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 w-fit border-emerald-500/20 bg-emerald-500/5 text-emerald-500">
                          {t("activeStudent")}
                        </Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer flex items-center justify-between py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400">Admin Dashboard 👑</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="cursor-pointer flex items-center justify-between py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{t("settings")}</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2 px-3"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span className="text-sm">{t("logout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
              </div>
            ) : (
              <>
                <div className="border-l pl-3 ml-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/auth")}
                    className="text-xs font-semibold"
                  >
                    {t("signIn")}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSettingsOpen(true)}
                  aria-label="Open settings"
                  className="rounded-xl"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
              </>
            )}
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
            <Badge variant="default" className="font-mono text-sm px-3 py-1 flex items-center gap-1">
              {selectedSymbol}
              <button
                onClick={() => setSelectedSymbol("")}
                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 outline-none transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </button>
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
                {predictionMutation.isPending ? t("analyzing") : t("generatePrediction")}
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full max-w-full justify-start overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-none md:w-auto md:inline-flex md:justify-center">
            <TabsTrigger value="overview" data-testid="tab-overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="analysis" data-testid="tab-analysis">{t("analysisAndPrediction")}</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">{t("historyAndMetrics")}</TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about">{t("aboutAndRisks")}</TabsTrigger>
          </TabsList>

          {activeTab === "overview" && (
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 space-y-4">
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
                  <Watchlist
                    onSelectStock={handleSelectStock}
                    currentSymbol={selectedSymbol}
                  />
                  <NewsFeed
                    articles={newsQuery.data ?? null}
                    isLoading={newsQuery.isLoading && !!selectedSymbol}
                    symbol={selectedSymbol}
                  />
                </div>
              </div>
              <Disclaimer />
            </TabsContent>
          )}

          {activeTab === "analysis" && (
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
          )}

          {activeTab === "history" && (
            <TabsContent value="history" className="space-y-4">
              <PredictionHistory
                predictions={historyQuery.data ?? null}
                isLoading={historyQuery.isLoading}
                isAuthenticated={!!user}
              />
            </TabsContent>
          )}

          {activeTab === "about" && (
            <TabsContent value="about" className="space-y-4">
              <RiskLimitations />
              <Disclaimer />
            </TabsContent>
          )}
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

      <AIChatAssistant activeSymbol={selectedSymbol} />
    </div>
  );
}
