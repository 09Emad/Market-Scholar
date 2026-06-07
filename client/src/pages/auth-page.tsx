import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertUserSchema, InsertUser, loginSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Brain, 
  TrendingUp, 
  Lock, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Cpu, 
  Layers, 
  Activity, 
  LineChart 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuthPage() {
  const { loginMutation, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotSimulatedLink, setForgotSimulatedLink] = useState<string | null>(null);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setIsForgotLoading(true);
    setForgotSimulatedLink(null);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: language === "en" ? "Reset Link Sent" : "تم إرسال رابط إعادة التعيين",
          description: t("resetLinkSent"),
        });
        if (data.simulated && data.link) {
          setForgotSimulatedLink(data.link);
        } else {
          setIsForgotOpen(false);
          setForgotEmail("");
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to process forgot password",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to process forgot password",
        variant: "destructive",
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const { data: googleConfig } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/auth/google/config"],
  });

  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "google_failed") {
      toast({
        title: "Google authentication failed",
        description: "Please try again or log in with your local account.",
        variant: "destructive",
      });
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);

  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: InsertUser) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: InsertUser) => {
    registerMutation.mutate(data);
  };

  // Watch password field to display password requirements in real-time
  const registerPasswordValue = registerForm.watch("password") || "";
  const reqs = {
    length: registerPasswordValue.length >= 8,
    upper: /[A-Z]/.test(registerPasswordValue),
    lower: /[a-z]/.test(registerPasswordValue),
    number: /[0-9]/.test(registerPasswordValue),
    special: /[@$!%*?&#^()_\-+={[\]}|:;"'<>,.?/~`]/.test(registerPasswordValue),
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden bg-background selection:bg-indigo-500/30">
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drawLine {
          0% { stroke-dashoffset: 300; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -300; }
        }
        .animate-draw {
          stroke-dasharray: 300;
          animation: drawLine 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes pulseAura {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        .pulse-aura {
          animation: pulseAura 10s ease-in-out infinite;
        }
        @keyframes floatBubble {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .animate-bubble-1 {
          animation: floatBubble 15s ease-in-out infinite;
        }
        .animate-bubble-2 {
          animation: floatBubble 18s ease-in-out infinite -5s;
        }
        @keyframes flowPulse {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .data-flow-line {
          stroke-dasharray: 6 6;
          animation: flowPulse 1.2s linear infinite;
        }
        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.33%, 0, 0); }
        }
        .animate-ticker {
          display: flex;
          width: 300%;
          animation: ticker 25s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
        .custom-grid {
          background-image: radial-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      ` }} />

      {/* Left Column: Form & Interaction */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden bg-background custom-grid border-r border-border/10">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/10 rounded-full filter blur-[100px] pointer-events-none animate-bubble-1" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none animate-bubble-2" />

        <div className="w-full max-w-md space-y-6 z-10">
          {/* Header Branding */}
          <div className="flex flex-col items-center text-center space-y-3 mb-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative h-16 w-16 bg-card rounded-2xl border border-border/50 flex items-center justify-center shadow-lg">
                <Brain className="h-9 w-9 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-primary/80">
                StockVision AI
              </h1>
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase mt-1">
                Academic LSTM Prediction System
              </p>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Support platform leveraging Deep LSTM networks and Sentiment Indicators for financial analysis.
            </p>
          </div>

          {/* Mobile Visual Showcase (visible only on small/medium screens) */}
          <div className="block lg:hidden w-full backdrop-blur-md bg-card/30 border border-border/50 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden mb-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none" />
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Activity className="h-3 w-3 text-primary animate-pulse" />
                LSTM Model Forecast
              </span>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-mono text-[9px] py-0 px-1.5">
                v2.4
              </Badge>
            </div>
            
            {/* Miniature actual vs prediction SVG */}
            <div className="relative py-1">
              <svg className="w-full h-16 stroke-emerald-500" viewBox="0 0 100 35" fill="none" strokeWidth="2">
                <line x1="0" y1="8" x2="100" y2="8" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="0" y1="18" x2="100" y2="18" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                <line x1="68" y1="0" x2="68" y2="35" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                
                <path
                  d="M 0 30 C 10 28, 15 15, 25 22 C 35 29, 45 10, 55 16 L 68 10"
                  stroke="#64748b"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M 68 10 C 72 8, 76 4, 82 7 C 88 10, 94 2, 100 4"
                  className="animate-draw"
                  stroke="#10b981"
                  strokeWidth="1.8"
                  filter="drop-shadow(0 0 2px #10b981)"
                />
                <path
                  d="M 68 10 C 72 8, 76 4, 82 7 C 88 10, 94 2, 100 4 L 100 35 L 68 35 Z"
                  fill="url(#grad-mobile)"
                  opacity="0.06"
                />
                <defs>
                  <linearGradient id="grad-mobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Micro metrics grid */}
            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
              <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/5 text-center">
                <div className="text-slate-400 mb-0.5">LOSS (MSE)</div>
                <div className="font-bold text-emerald-400">0.0024</div>
              </div>
              <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/5 text-center">
                <div className="text-slate-400 mb-0.5">ACCURACY</div>
                <div className="font-bold text-emerald-400">53.2%</div>
              </div>
              <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/5 text-center">
                <div className="text-slate-400 mb-0.5">OPTIMIZER</div>
                <div className="font-bold text-emerald-400">Adam</div>
              </div>
            </div>
          </div>

          {/* Form Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="flex w-full h-auto p-1 bg-muted/60 backdrop-blur-md rounded-xl border border-border/40 mb-6">
              <TabsTrigger 
                value="login" 
                className="flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Register
              </TabsTrigger>
            </TabsList>


            {/* Login Card */}
            <TabsContent value="login" className="transition-all duration-300">
              <Card className="border-border/50 shadow-2xl bg-card/40 backdrop-blur-xl rounded-2xl">
                <CardHeader className="space-y-1.5">
                  <CardTitle className="text-xl font-bold">Welcome Back</CardTitle>
                  <CardDescription className="text-xs">
                    Please log in to query models and inspect live time-series projections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      {/* Username */}
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-muted-foreground">Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                                <Input
                                  placeholder="Enter your username"
                                  className="pl-10 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Password */}
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-muted-foreground">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Forgot Password Link */}
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotSimulatedLink(null);
                            setForgotEmail("");
                            setIsForgotOpen(true);
                          }}
                          className="text-xs font-semibold text-primary hover:underline hover:text-primary/90 transition-colors"
                        >
                          {t("forgotPassword")}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full mt-6 font-bold text-sm h-11 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 rounded-xl transition-all duration-200 active:scale-[0.98]"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <Activity className="h-4 w-4 animate-spin" />
                            Authenticating...
                          </span>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Card */}
            <TabsContent value="register" className="transition-all duration-300">
              <Card className="border-border/50 shadow-2xl bg-card/40 backdrop-blur-xl rounded-2xl">
                <CardHeader className="space-y-1.5">
                  <CardTitle className="text-xl font-bold">Academic Registry</CardTitle>
                  <CardDescription className="text-xs">
                    Create your account to run LSTM training cycles and download prediction logs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      {/* Username */}
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-muted-foreground">Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                                <Input
                                  placeholder="Choose a username"
                                  className="pl-10 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Password */}
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-semibold text-muted-foreground">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                                <Input
                                  type={showRegisterPassword ? "text" : "password"}
                                  placeholder="At least 8 characters"
                                  className="pl-10 pr-10 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                                >
                                  {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Password Security Check Indicator */}
                      <div className="bg-muted/40 border border-border/30 rounded-xl p-3 space-y-2 text-xs">
                        <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                          Security Requirements
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {reqs.length ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className={reqs.length ? "text-foreground font-medium" : "text-muted-foreground"}>8+ Characters</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {reqs.upper ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className={reqs.upper ? "text-foreground font-medium" : "text-muted-foreground"}>Uppercase letter</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {reqs.lower ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className={reqs.lower ? "text-foreground font-medium" : "text-muted-foreground"}>Lowercase letter</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {reqs.number ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className={reqs.number ? "text-foreground font-medium" : "text-muted-foreground"}>Number (0-9)</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2">
                            {reqs.special ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className={reqs.special ? "text-foreground font-medium" : "text-muted-foreground"}>Special character (@,$,!,etc.)</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full mt-4 font-bold text-sm h-11 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 rounded-xl transition-all duration-200 active:scale-[0.98]"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <Activity className="h-4 w-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          "Register Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border/20"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Or continue with</span>
              <div className="flex-grow border-t border-border/20"></div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full font-semibold text-sm h-11 border-border/60 hover:bg-muted/40 backdrop-blur-xl rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 group relative overflow-hidden"
              disabled={!googleConfig?.configured}
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              {googleConfig?.configured && (
                <span className="absolute inset-0 bg-gradient-to-r from-primary/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              )}
              
              <svg className={`h-5 w-5 mr-1 ${!googleConfig?.configured ? "opacity-40 grayscale" : ""}`} viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.29c1.92,-1.77 3.02,-4.38 3.02,-7.4C21.65,11.75 21.55,11.4 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.19l-3.29,-2.6c-0.91,0.61 -2.08,0.98 -3.37,0.98 -2.35,0 -4.34,-1.59 -5.05,-3.72H2.86v2.7C4.34,18.8 8.01,20.62 12,20.62z" fill="#34A853" />
                  <path d="M6.95,13.09C6.77,12.55 6.77,11.96 6.95,11.42V8.72H2.86c-0.62,1.24 -0.98,2.65 -0.98,4.14s0.36,2.9 0.98,4.14L6.95,13.09z" fill="#FBBC05" />
                  <path d="M12,6.09c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.34 14.41,2.5 12,2.5c-4.01,0 -7.67,1.82 -9.14,4.82l4.09,2.7C7.66,7.68 9.65,6.09 12,6.09z" fill="#EA4335" />
                </g>
              </svg>
              {googleConfig?.configured ? "Sign in with Google" : "Google Sign-In (Not Configured)"}
            </Button>
          </div>

          <div className="text-center text-[11px] text-muted-foreground border-t border-border/20 pt-4">
            StockVision Platform • Open-Source Research • Academic Graduation Thesis
          </div>
        </div>

        {/* Forgot Password Dialog */}
        <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
          <DialogContent className="max-w-md bg-card/90 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl p-6 selection:bg-primary/20">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
                {t("forgotPassword")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {language === "en" 
                  ? "Enter your email address and we will generate a secure reset link for your account." 
                  : "أدخل بريدك الإلكتروني وسنقوم بتوليد رابط آمن لإعادة تعيين كلمة مرور حسابك."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleForgotSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{t("emailAddress")}</label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl text-xs"
                />
              </div>

              {forgotSimulatedLink && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[11px] font-mono rounded-xl p-3 space-y-2 mt-2">
                  <div className="font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
                    [SIMULATION MODE ACTIVE]
                  </div>
                  <div className="text-slate-300 leading-relaxed word-break-all select-all">
                    Reset Link: <a href={forgotSimulatedLink} className="underline text-yellow-400">{forgotSimulatedLink}</a>
                  </div>
                  <div className="text-slate-400 text-[9px]">
                    {language === "en" 
                      ? "Click the link above to test password reset directly." 
                      : "انقر على الرابط أعلاه لتجربة إعادة تعيين كلمة المرور مباشرة."}
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsForgotOpen(false)}
                  className="rounded-xl text-xs"
                >
                  {language === "en" ? "Cancel" : "إلغاء"}
                </Button>
                <Button
                  type="submit"
                  disabled={isForgotLoading}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-xs font-bold px-4"
                >
                  {isForgotLoading ? (
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3 animate-spin" />
                      {language === "en" ? "Sending..." : "جاري الإرسال..."}
                    </span>
                  ) : (
                    t("sendResetLink")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Right Column: AI Deep Learning Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#0c0f1d] via-[#0d122b] to-[#080a14] text-white relative overflow-hidden border-l border-white/5">
        {/* Dynamic Glow Auras */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[120px] pointer-events-none pulse-aura" />
        <div className="absolute bottom-1/4 left-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none pulse-aura" style={{ animationDelay: "-4s" }} />

        {/* Ticker Streamer Header */}
        <div className="absolute top-0 left-0 w-full bg-white/[0.02] backdrop-blur-sm border-b border-white/5 py-2 overflow-hidden z-20">
          <div className="animate-ticker text-[10px] font-mono tracking-wider text-slate-400">
            {/* Ticker Set 1 */}
            <div className="flex gap-8 justify-around min-w-full">
              <span>AAPL <span className="text-emerald-400 font-bold">▲ LSTM BUY (84%)</span></span>
              <span>MSFT <span className="text-slate-400 font-bold">● LSTM HOLD (51%)</span></span>
              <span>TSLA <span className="text-red-400 font-bold">▼ LSTM SELL (72%)</span></span>
              <span>NVDA <span className="text-emerald-400 font-bold">▲ LSTM BUY (91%)</span></span>
              <span>AMZN <span className="text-emerald-400 font-bold">▲ LSTM BUY (68%)</span></span>
            </div>
            {/* Ticker Set 2 */}
            <div className="flex gap-8 justify-around min-w-full">
              <span>AAPL <span className="text-emerald-400 font-bold">▲ LSTM BUY (84%)</span></span>
              <span>MSFT <span className="text-slate-400 font-bold">● LSTM HOLD (51%)</span></span>
              <span>TSLA <span className="text-red-400 font-bold">▼ LSTM SELL (72%)</span></span>
              <span>NVDA <span className="text-emerald-400 font-bold">▲ LSTM BUY (91%)</span></span>
              <span>AMZN <span className="text-emerald-400 font-bold">▲ LSTM BUY (68%)</span></span>
            </div>
            {/* Ticker Set 3 */}
            <div className="flex gap-8 justify-around min-w-full">
              <span>AAPL <span className="text-emerald-400 font-bold">▲ LSTM BUY (84%)</span></span>
              <span>MSFT <span className="text-slate-400 font-bold">● LSTM HOLD (51%)</span></span>
              <span>TSLA <span className="text-red-400 font-bold">▼ LSTM SELL (72%)</span></span>
              <span>NVDA <span className="text-emerald-400 font-bold">▲ LSTM BUY (91%)</span></span>
              <span>AMZN <span className="text-emerald-400 font-bold">▲ LSTM BUY (68%)</span></span>
            </div>
          </div>
        </div>

        {/* Top Info */}
        <div className="flex items-center justify-between z-10 mt-6">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-emerald-400 animate-spin" style={{ animationDuration: "8s" }} />
            <span className="font-semibold tracking-wider text-xs text-slate-300">STOCKVISION R&D LABS</span>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] py-0.5">
            Model: Stacked LSTM v2.4
          </Badge>
        </div>

        {/* Neural Network Visualization & Graph */}
        <div className="my-auto space-y-6 z-10 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
              Predicting Market Behaviors via Neural Sequences
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our system captures temporal correlations in historical stocks. By integrating indicators with sentiment features, the LSTM network maps sequential patterns to predict short-term directional trends.
            </p>
          </div>

          {/* Glass Graphic Container */}
          <div className="backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Network Architecture & Forecast
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-400">EPOCH 150/150</span>
              </div>
            </div>

            {/* Neural Net Nodes Flow Diagram (SVG) */}
            <div className="relative py-2 border-b border-white/5">
              <svg className="w-full h-16" viewBox="0 0 200 45" fill="none">
                {/* Connection lines with animated pulses */}
                <path d="M 15 10 L 60 8 M 15 22 L 60 22 M 15 35 L 60 36" stroke="#4f46e5" strokeWidth="1" opacity="0.3" />
                <path d="M 60 8 L 110 22 M 60 22 L 110 22 M 60 36 L 110 22" stroke="#10b981" strokeWidth="1" opacity="0.4" />
                <path d="M 110 22 L 160 22" stroke="#a78bfa" strokeWidth="1.2" opacity="0.6" />

                {/* Data flow animate dots */}
                <path d="M 15 10 L 60 8 M 15 22 L 60 22 M 15 35 L 60 36" stroke="#818cf8" strokeWidth="1" className="data-flow-line" />
                <path d="M 60 8 L 110 22 M 60 22 L 110 22 M 60 36 L 110 22" stroke="#34d399" strokeWidth="1" className="data-flow-line" />
                <path d="M 110 22 L 160 22" stroke="#c084fc" strokeWidth="1.2" className="data-flow-line" />

                {/* Input Layer Nodes */}
                <circle cx="15" cy="10" r="3.5" fill="#4f46e5" filter="drop-shadow(0 0 2px #4f46e5)" />
                <circle cx="15" cy="22" r="3.5" fill="#4f46e5" filter="drop-shadow(0 0 2px #4f46e5)" />
                <circle cx="15" cy="35" r="3.5" fill="#4f46e5" filter="drop-shadow(0 0 2px #4f46e5)" />
                <text x="1" y="25" fill="#818cf8" fontSize="4.5" fontWeight="bold">INPUT</text>

                {/* LSTM Hidden Nodes */}
                <rect x="55" y="4" width="10" height="8" rx="2" fill="#10b981" filter="drop-shadow(0 0 3px #10b981)" />
                <rect x="55" y="18" width="10" height="8" rx="2" fill="#10b981" filter="drop-shadow(0 0 3px #10b981)" />
                <rect x="55" y="32" width="10" height="8" rx="2" fill="#10b981" filter="drop-shadow(0 0 3px #10b981)" />
                <text x="52" y="43" fill="#34d399" fontSize="4" fontWeight="bold">LSTM CELLS</text>

                {/* Dense Node */}
                <circle cx="110" cy="22" r="5" fill="#8b5cf6" filter="drop-shadow(0 0 4px #8b5cf6)" />
                <text x="104" y="32" fill="#a78bfa" fontSize="4" fontWeight="bold">DENSE</text>

                {/* Prediction Output Node */}
                <circle cx="160" cy="22" r="4.5" fill="#ec4899" filter="drop-shadow(0 0 5px #ec4899)" />
                <text x="150" y="31" fill="#f472b6" fontSize="4.5" fontWeight="bold">PREDICTION</text>
              </svg>
            </div>

            {/* Time-Series Forecast Plot */}
            <div className="relative py-1">
              <svg className="w-full h-24 stroke-emerald-500" viewBox="0 0 100 35" fill="none" strokeWidth="2">
                {/* Horizontal reference lines */}
                <line x1="0" y1="8" x2="100" y2="8" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                <line x1="0" y1="18" x2="100" y2="18" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

                {/* Divider line for forecast window */}
                <line x1="68" y1="0" x2="68" y2="35" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
                <text x="70" y="5" fill="rgba(255,255,255,0.4)" fontSize="3.5" fontFamily="monospace">Forecast</text>
                <text x="50" y="5" fill="rgba(255,255,255,0.4)" fontSize="3.5" fontFamily="monospace">Historical</text>

                {/* Actual Historical Line */}
                <path
                  d="M 0 30 C 10 28, 15 15, 25 22 C 35 29, 45 10, 55 16 L 68 10"
                  stroke="#64748b"
                  strokeWidth="1.5"
                  fill="none"
                />

                {/* LSTM Prediction Line (Glows Green) */}
                <path
                  d="M 68 10 C 72 8, 76 4, 82 7 C 88 10, 94 2, 100 4"
                  className="animate-draw"
                  stroke="#10b981"
                  strokeWidth="2"
                  filter="drop-shadow(0 0 3px #10b981)"
                />

                {/* Shaded Area under Forecast */}
                <path
                  d="M 68 10 C 72 8, 76 4, 82 7 C 88 10, 94 2, 100 4 L 100 35 L 68 35 Z"
                  fill="url(#grad)"
                  opacity="0.08"
                />

                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Model Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">LOSS FUNCTION</div>
                <div className="font-bold text-emerald-400">MSE: 0.0024</div>
              </div>
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">OPTIMIZER</div>
                <div className="font-bold text-emerald-400">Adam (lr=0.001)</div>
              </div>
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">LAYERS</div>
                <div className="font-bold text-emerald-400">Stacked LSTM</div>
              </div>
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">TRAINING</div>
                <div className="font-bold text-emerald-400">Early Stopping</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-6 z-10">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Rate-Limited & Encrypted Sessions
          </span>
          <span>Faculty of Information Technology</span>
        </div>
      </div>
    </div>
  );
}
