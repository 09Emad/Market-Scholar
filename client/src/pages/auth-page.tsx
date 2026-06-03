import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Brain, TrendingUp, Lock, User, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuthPage() {
  const { loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
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

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Dynamic inline styles for premium animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drawLine {
          0% { stroke-dashoffset: 300; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -300; }
        }
        .animate-draw {
          stroke-dasharray: 300;
          animation: drawLine 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes pulseAura {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.1); }
        }
        .pulse-aura {
          animation: pulseAura 8s ease-in-out infinite;
        }
      ` }} />

      {/* Left Column: Forms */}
      <div className="flex items-center justify-center p-8 bg-background relative overflow-hidden">
        {/* Subtle background details */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-84 h-84 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 z-10">
          <div className="flex flex-col items-center text-center space-y-2 mb-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Brain className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">StockVision AI</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              Academic decision support platform for stock analysis and predictions using LSTM neural networks.
            </p>
          </div>

          {/* Mobile Visual Showcase (visible only on small/medium screens) */}
          <div className="block lg:hidden backdrop-blur-md bg-card/40 border border-border/50 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none" />
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Inference Preview</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-semibold text-emerald-500">Active Market</span>
              </div>
            </div>
            <div className="relative py-1">
              <svg className="w-full h-16 stroke-emerald-500" viewBox="0 0 100 40" fill="none" strokeWidth="2.5">
                <path
                  d="M 0 35 C 15 32, 25 10, 40 22 C 55 35, 70 8, 85 14 L 100 2"
                  className="animate-draw"
                />
                <path
                  d="M 0 35 C 15 32, 25 10, 40 22 C 55 35, 70 8, 85 14 L 100 2 L 100 40 L 0 40 Z"
                  fill="url(#grad-mobile)"
                  opacity="0.08"
                />
                <defs>
                  <linearGradient id="grad-mobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[10px]">
              <div className="bg-muted/40 p-1.5 rounded-lg border border-border/30">
                <div className="text-muted-foreground mb-0.5">Latency</div>
                <div className="font-bold text-emerald-500">&lt; 50ms</div>
              </div>
              <div className="bg-muted/40 p-1.5 rounded-lg border border-border/30">
                <div className="text-muted-foreground mb-0.5">Accuracy</div>
                <div className="font-bold text-emerald-500">53.2%</div>
              </div>
              <div className="bg-muted/40 p-1.5 rounded-lg border border-border/30">
                <div className="text-muted-foreground mb-0.5">Indicators</div>
                <div className="font-bold text-emerald-500">MACD + RSI</div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="text-sm">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card className="border-border/60 shadow-lg bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Welcome Back</CardTitle>
                  <CardDescription>
                    Enter your credentials to access the dashboard and real-time analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs flex justify-between">
                              <span>Username</span>
                              <User className="h-3 w-3 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your username"
                                className="bg-background/80"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs flex justify-between">
                              <span>Password</span>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="bg-background/80"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full mt-4 font-semibold text-sm h-10 transition-all active:scale-[0.98]"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <Card className="border-border/60 shadow-lg bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Create Account</CardTitle>
                  <CardDescription>
                    Register to run neural networks and execute real-time stock predictions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs flex justify-between">
                              <span>Username</span>
                              <User className="h-3 w-3 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Choose a username"
                                className="bg-background/80"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs flex justify-between">
                              <span>Password</span>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="At least 6 characters"
                                className="bg-background/80"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full mt-4 font-semibold text-sm h-10 transition-all active:scale-[0.98]"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Registering..." : "Register"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center text-xs text-muted-foreground mt-4">
            Academic graduation project for monitoring and studying financial markets using AI.
          </div>
        </div>
      </div>

      {/* Right Column: Visual Showcase */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden border-l border-white/5">
        {/* Decorative Radial Glowing Auras */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full filter blur-3xl pointer-events-none pulse-aura" />
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none pulse-aura" style={{ animationDelay: "-3s" }} />

        {/* Header decoration */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold tracking-wider text-sm text-slate-300">STOCKVISION RESEARCH</span>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            LSTM Model v2.1
          </Badge>
        </div>

        {/* Hero Content */}
        <div className="my-auto space-y-8 z-10 max-w-lg">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Integrated Financial Insights Powered by Deep Learning
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              The system analyzes time series stock data, merges technical indicators (RSI, MACD) with real-time news sentiment processing to generate highly accurate price trend predictions.
            </p>
          </div>

          {/* Glassmorphism Graphic */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <span className="text-xs text-slate-400">Live Inference Cycle</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-emerald-400">Active Market Mode</span>
              </div>
            </div>

            {/* SVG Animated Chart */}
            <div className="relative py-2">
              <svg className="w-full h-32 stroke-emerald-400" viewBox="0 0 100 40" fill="none" strokeWidth="2.5">
                <path
                  d="M 0 35 C 15 32, 25 10, 40 22 C 55 35, 70 8, 85 14 L 100 2"
                  className="animate-draw"
                />
                <path
                  d="M 0 35 C 15 32, 25 10, 40 22 C 55 35, 70 8, 85 14 L 100 2 L 100 40 L 0 40 Z"
                  fill="url(#grad)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Micro Stats Row */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">Response Time</div>
                <div className="font-bold text-emerald-400">&lt; 50ms</div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">Model Accuracy</div>
                <div className="font-bold text-emerald-400">53.2%</div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="text-slate-400 mb-0.5">Built-in Indicators</div>
                <div className="font-bold text-emerald-400">MACD + RSI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/10 pt-6 z-10">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Fully Encrypted & Secure Data
          </span>
          <span>Faculty of Information Technology & Sciences</span>
        </div>
      </div>
    </div>
  );
}
