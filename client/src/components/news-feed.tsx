import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, ExternalLink, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import type { NewsArticle } from "@shared/schema";

interface NewsFeedProps {
  articles: NewsArticle[] | null;
  isLoading: boolean;
  symbol: string;
}

function getSentimentConfig(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return {
        label: "Positive",
        icon: <ThumbsUp className="h-3 w-3" />,
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      };
    case "negative":
      return {
        label: "Negative",
        icon: <ThumbsDown className="h-3 w-3" />,
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      };
    default:
      return {
        label: "Neutral",
        icon: <Minus className="h-3 w-3" />,
        className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
      };
  }
}

export function NewsFeed({ articles, isLoading, symbol }: NewsFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            News & Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-md bg-muted/40">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-3/4 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            News & Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {symbol ? "No recent news available" : "Select a stock to view related news"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sentimentCounts = {
    positive: articles.filter((a) => a.sentiment === "positive").length,
    negative: articles.filter((a) => a.sentiment === "negative").length,
    neutral: articles.filter((a) => a.sentiment === "neutral" || !a.sentiment).length,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Newspaper className="h-4 w-4" />
          News & Sentiment for {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex gap-2 mb-3 flex-wrap">
          <Badge variant="secondary" className="text-xs gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 no-default-hover-elevate no-default-active-elevate">
            <ThumbsUp className="h-3 w-3" />
            {sentimentCounts.positive} Positive
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 no-default-hover-elevate no-default-active-elevate">
            <ThumbsDown className="h-3 w-3" />
            {sentimentCounts.negative} Negative
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1 no-default-hover-elevate no-default-active-elevate">
            <Minus className="h-3 w-3" />
            {sentimentCounts.neutral} Neutral
          </Badge>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-3">
            {articles.map((article, i) => {
              const sentConfig = getSentimentConfig(article.sentiment);
              return (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-md bg-muted/40 hover-elevate transition-colors group"
                  data-testid={`link-news-${i}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium leading-snug line-clamp-2 flex-1">
                      {article.title}
                    </h4>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ visibility: "visible" }} />
                  </div>
                  {article.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md ${sentConfig.className}`}>
                      {sentConfig.icon}
                      {sentConfig.label}
                      {article.sentimentScore !== undefined && (
                        <span className="font-mono">
                          ({(article.sentimentScore * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {article.source}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
