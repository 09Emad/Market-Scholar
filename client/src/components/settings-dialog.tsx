import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-toggle";
import { translations, Language } from "@/lib/translations";
import { Sun, Moon, Languages, Settings2 } from "lucide-react";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LANGUAGES: Array<{ id: Language; label: string; flag: string }> = [
  { id: "en", label: "English", flag: "🇺🇸" },
  { id: "tr", label: "Türkçe", flag: "🇹🇷" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { isDark, language, toggle, setLanguage } = useTheme();

  const t = (key: keyof typeof translations.en) => {
    const langTrans = translations[language] || translations.en;
    return langTrans[key] || translations.en[key] || key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/60 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl p-6 selection:bg-primary/20">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary animate-pulse" />
            {t("settings")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {language === "tr"
              ? "Tema ve dil tercihlerinizi özelleştirin."
              : "Customize your theme and language preferences."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* Appearance Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {t("appearance")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={!isDark ? "default" : "outline"}
                onClick={isDark ? toggle : undefined}
                className="h-10 font-semibold text-sm rounded-xl active:scale-95 transition-all"
              >
                <Sun className="h-4 w-4 mr-2" />
                {t("light")}
              </Button>
              <Button
                variant={isDark ? "default" : "outline"}
                onClick={!isDark ? toggle : undefined}
                className="h-10 font-semibold text-sm rounded-xl active:scale-95 transition-all"
              >
                <Moon className="h-4 w-4 mr-2" />
                {t("dark")}
              </Button>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" />
              {t("language")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((item) => (
                <Button
                  key={item.id}
                  variant={language === item.id ? "default" : "outline"}
                  onClick={() => setLanguage(item.id)}
                  className="h-10 font-semibold text-sm rounded-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="text-base">{item.flag}</span>
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex mt-6 justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="font-bold text-sm h-10 px-6 rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-all"
          >
            {t("saveClose")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
