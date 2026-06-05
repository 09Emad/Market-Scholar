import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareCode,
  Sparkles,
  Send,
  X,
  Loader2,
  Lock,
  Trash2,
  User,
  Bot,
  ArrowDownCircle,
} from "lucide-react";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

const isArabic = (text: string) => {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text);
};

interface AIChatAssistantProps {
  activeSymbol?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export function AIChatAssistant({ activeSymbol }: AIChatAssistantProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`stockvision_chat_${user.id}`);
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored chat history", e);
        }
      } else {
        // Default greeting message
        const greeting: Message = {
          id: "welcome",
          role: "assistant",
          content: t("aiAssistantWelcome"),
          timestamp: new Date().toISOString(),
        };
        setMessages([greeting]);
      }
    } else {
      // Unauthenticated state default message
      setMessages([
        {
          id: "auth-intro",
          role: "assistant",
          content: t("aiAssistantGuestWelcome"),
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [user, language]);

  // Save chat history to localStorage when changed
  useEffect(() => {
    if (user && messages.length > 0) {
      localStorage.setItem(`stockvision_chat_${user.id}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll to bottom when messages change or window opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, scrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollDown(!isAtBottom && messages.length > 2);
  };

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText) return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to chat with the AI assistant.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      // Map message history to required backend format: Array<{ role, content }>
      const history = messages
        .filter(m => m.id !== "welcome" && m.id !== "auth-intro")
        .map(m => ({
          role: m.role,
          content: m.content
        }))
        .slice(-8); // Keep last 8 messages for context window efficiency

      const response = await apiRequest("POST", "/api/ai/chat", {
        message: messageText,
        chatHistory: history,
        symbol: activeSymbol || null,
      });
      
      const data = await response.json();
      
      const assistantMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Failed to fetch chat response:", error);
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: "Sorry, I encountered an error. The local LLM server (Ollama) might be busy or unreachable. Please try again in a few moments.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (!user) return;
    localStorage.removeItem(`stockvision_chat_${user.id}`);
    const greeting: Message = {
      id: "welcome",
      role: "assistant",
      content: t("aiAssistantWelcome"),
      timestamp: new Date().toISOString(),
    };
    setMessages([greeting]);
  };

  // Pre-compiled query chips
  const getChips = () => {
    if (activeSymbol) {
      return [
        { label: language === "en" ? `Explain ${activeSymbol} prediction` : `${activeSymbol} tahminini açıkla`, prompt: `Can you explain the current prediction and direction for ${activeSymbol}?` },
        { label: language === "en" ? `Analyze ${activeSymbol} sentiment` : `${activeSymbol} duyarlılığını analiz et`, prompt: `Summarize the news sentiment for ${activeSymbol} right now.` },
        { label: language === "en" ? `LSTM explanation` : `LSTM açıklaması`, prompt: `Explain why the LSTM neural network has this confidence score.` }
      ];
    }
    return [
      { label: t("whatIsLSTM"), prompt: "Explain how Long Short-Term Memory (LSTM) neural networks predict stock prices." },
      { label: t("explainRSI"), prompt: "Explain the Relative Strength Index (RSI) formula and how it detects overbought/oversold levels." },
      { label: t("whatIsMACD"), prompt: "Explain MACD, the Signal Line, and how moving average crossovers signal trades." }
    ];
  };

  // Helper function to render formatted message parts
  const renderMessageContent = (content: string) => {
    // Splits by bold indicators, inline backticks, and newlines
    const parts = content.split(/(\*\*.*?\*\*|`.*?`|\n)/);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-extrabold text-foreground tracking-wide">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="bg-background/80 border border-border/50 px-1.5 py-0.5 rounded font-mono text-[11px] text-primary/90">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part === "\n") {
        return <br key={index} />;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-[365px] sm:w-[400px] h-[550px] max-h-[80vh] bg-background/80 dark:bg-background/70 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl overflow-hidden flex flex-col mb-4 origin-bottom-right"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10 border-b border-border/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1">
                    StockVision AI
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase bg-primary/5 border-primary/25 text-primary scale-90">
                      RAG Llama
                    </Badge>
                  </h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    {activeSymbol ? (
                      <span className="text-primary font-semibold flex items-center gap-1">
                        Active context: <span className="underline font-mono">{activeSymbol}</span>
                      </span>
                    ) : (
                      "General market assistant"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {user && messages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearHistory}
                    title="Clear history"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 text-muted-foreground hover:bg-muted/80 rounded-md"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 relative overflow-hidden flex flex-col bg-muted/20 dark:bg-muted/10">
              {/* If user is not logged in - show beautiful premium wall */}
              {!user ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-background/90 backdrop-blur-sm">
                  <div className="h-14 w-14 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary mb-4 animate-bounce">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-foreground mb-2">
                    Unlock AI Financial Assistant
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-[280px] mb-6 leading-relaxed">
                    Access real-time RAG context, explanations of LSTM network models, and technical indicator glossary by signing in.
                  </p>
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      setLocation("/auth");
                    }}
                    size="sm"
                    className="w-full max-w-[200px] gap-2 font-semibold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    Sign In
                  </Button>
                </div>
              ) : null}

              {/* Message scroll area */}
              <ScrollArea className="flex-1 px-4 py-4" onScrollCapture={handleScroll} ref={scrollAreaRef}>
                <div className="space-y-4 pb-4">
                  {messages.map((m) => {
                    const isBot = m.role === "assistant";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 max-w-[85%] ${
                          isBot ? "self-start" : "self-end ml-auto flex-row-reverse"
                        }`}
                      >
                        <div
                          className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs border ${
                            isBot
                              ? "bg-primary/5 border-primary/15 text-primary"
                              : "bg-muted border-border/80 text-foreground"
                          }`}
                        >
                          {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div
                          dir={isArabic(m.content) ? "rtl" : "ltr"}
                          className={`rounded-2xl px-3.5 py-2.5 text-xs md:text-[13px] leading-relaxed shadow-sm border ${
                            isArabic(m.content) ? "text-right" : "text-left"
                          } ${
                            isBot
                              ? "bg-card border-border/40 rounded-tl-none text-foreground"
                              : "bg-primary text-primary-foreground border-primary/20 rounded-tr-none"
                          }`}
                        >
                          {renderMessageContent(m.content)}
                          <span
                            dir="ltr"
                            className={`block text-[9px] mt-1 text-right ${
                              isBot ? "text-muted-foreground" : "text-primary-foreground/70"
                            }`}
                          >
                            {new Date(m.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5 max-w-[85%] self-start">
                      <div className="h-7 w-7 rounded-full bg-primary/5 border border-primary/15 text-primary flex items-center justify-center text-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-card border border-border/40 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs shadow-sm flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Scroll down button indicator */}
              {showScrollDown && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground p-1.5 rounded-full shadow-lg hover:bg-primary hover:scale-105 active:scale-95 transition-all z-20 flex items-center gap-1 text-[10px] font-medium"
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  Scroll
                </button>
              )}
            </div>

            {/* Quick chips (only visible if logged in and not loading) */}
            {user && !isLoading && (
              <div className="px-4 py-2 bg-muted/10 border-t border-border/20">
                <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
                  {getChips().map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip.prompt)}
                      className="text-[10px] md:text-xs bg-card border border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all px-2.5 py-1 rounded-full whitespace-nowrap text-muted-foreground font-medium"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-card border-t border-border/30 flex items-center gap-2">
              <Input
                dir={isArabic(input) ? "rtl" : "ltr"}
                disabled={isLoading || !user}
                placeholder={
                  !user
                    ? "Sign in to start chat..."
                    : activeSymbol
                    ? `Ask about ${activeSymbol}...`
                    : "Ask about stocks, LSTM, RSI..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="text-xs h-9 bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/60 border-border/80"
              />
              <Button
                disabled={isLoading || !input.trim() || !user}
                size="icon"
                onClick={() => handleSend()}
                className="h-9 w-9 flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isOpen ? {} : { scale: [1, 1.05, 1] }}
        transition={isOpen ? {} : { repeat: Infinity, duration: 4, ease: "easeInOut" }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center relative border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative flex items-center justify-center"
            >
              <MessageSquareCode className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
              <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-yellow-300 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute right-14 bg-card text-foreground border border-border/60 px-2 py-1 rounded-md text-[10px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Ask StockVision AI
          </span>
        )}
      </motion.button>
    </div>
  );
}
