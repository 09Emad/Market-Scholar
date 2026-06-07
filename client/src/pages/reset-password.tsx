import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";
import {
  Brain,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Activity,
  ArrowLeft
} from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useTheme();
  
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Extract token from URL query params (?token=XYZ)
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  // Password requirement checks
  const reqs = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&#^()_\-+={[\]}|:;"'<>,.?/~`]/.test(password),
  };

  const allReqsMet = Object.values(reqs).every(Boolean);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "Error",
        description: "Missing or invalid token",
        variant: "destructive",
      });
      return;
    }
    if (!allReqsMet) {
      toast({
        title: "Error",
        description: "Password does not meet the security requirements",
        variant: "destructive",
      });
      return;
    }
    if (!passwordsMatch) {
      toast({
        title: "Error",
        description: t("passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: language === "en" ? "Success" : "تمت العملية بنجاح",
          description: t("passwordResetSuccess"),
        });
        setTimeout(() => {
          setLocation("/auth");
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0c0f1d] via-[#0d122b] to-[#080a14] relative overflow-hidden selection:bg-indigo-500/30">
      {/* Decorative Aura Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/10 rounded-full filter blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: "-3s" }} />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Logo and branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-indigo-500 rounded-2xl blur opacity-30"></div>
            <div className="relative h-14 w-14 bg-card rounded-2xl border border-border/50 flex items-center justify-center shadow-lg">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-primary/80">
              StockVision AI
            </h1>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase mt-0.5">
              Password Recovery
            </p>
          </div>
        </div>

        {/* Reset Password Form Card */}
        <Card className="border-border/50 shadow-2xl bg-card/40 backdrop-blur-xl rounded-2xl">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-xl font-bold">{t("resetPassword")}</CardTitle>
            <CardDescription className="text-xs">
              {language === "en" 
                ? "Enter your new password to regain access to your account." 
                : "أدخل كلمة المرور الجديدة لاستعادة إمكانية الوصول إلى حسابك."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="text-center py-4 space-y-4">
                <div className="text-destructive text-sm font-semibold">
                  {language === "en" ? "Reset token is missing or invalid" : "رمز إعادة التعيين غير موجود أو غير صالح"}
                </div>
                <Button
                  onClick={() => setLocation("/auth")}
                  variant="outline"
                  className="rounded-xl text-xs gap-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {language === "en" ? "Back to Login" : "العودة لتسجيل الدخول"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("newPassword")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl text-xs h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t("confirmNewPassword")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl text-xs h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-destructive text-[11px] font-semibold mt-1 px-1">{t("passwordsDoNotMatch")}</p>
                  )}
                </div>

                {/* Security requirements list */}
                <div className="bg-muted/40 border border-border/30 rounded-xl p-3 space-y-2 text-xs">
                  <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                    {t("passwordRequirements")}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {reqs.length ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className={reqs.length ? "text-foreground font-medium animate-pulse" : "text-muted-foreground"}>{t("reqLength")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {reqs.upper ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className={reqs.upper ? "text-foreground font-medium" : "text-muted-foreground"}>{t("reqUpper")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {reqs.lower ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className={reqs.lower ? "text-foreground font-medium" : "text-muted-foreground"}>{t("reqLower")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {reqs.number ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className={reqs.number ? "text-foreground font-medium" : "text-muted-foreground"}>{t("reqNumber")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      {reqs.special ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className={reqs.special ? "text-foreground font-medium" : "text-muted-foreground"}>{t("reqSpecial")}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4 font-bold text-sm h-11 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  disabled={isLoading || !allReqsMet || !passwordsMatch}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Activity className="h-4 w-4 animate-spin" />
                      {language === "en" ? "Processing..." : "جاري المعالجة..."}
                    </span>
                  ) : (
                    t("resetPassword")
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
