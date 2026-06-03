import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Sleek progress bar animation logic
    const duration = 1500; // 1.5 seconds
    const intervalTime = 30; // update every 30ms
    const step = 100 / (duration / intervalTime);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    // 2. Start fade out slightly before complete
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1800);

    // 3. Complete and unmount
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090d16] text-white transition-opacity duration-500 ease-in-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Dynamic Keyframes Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes splashPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.4)) drop-shadow(0 0 30px rgba(59, 130, 246, 0.2));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 25px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 45px rgba(99, 102, 241, 0.4));
          }
        }
        @keyframes textSlideUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .splash-pulse-icon {
          animation: splashPulse 2.5s ease-in-out infinite;
        }
        .splash-text {
          animation: textSlideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      ` }} />

      {/* Decorative Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full filter blur-[100px] pointer-events-none opacity-60" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full filter blur-[80px] pointer-events-none opacity-40" />

      <div className="flex flex-col items-center space-y-6 z-10">
        {/* Animated Custom Logo */}
        <div className="relative p-1 rounded-3xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl shadow-2xl">
          <img
            src="/favicon.png"
            alt="StockVision Logo"
            className="h-24 w-24 rounded-2xl splash-pulse-icon"
          />
        </div>

        {/* Faded text */}
        <div className="text-center space-y-2 splash-text">
          <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-200 to-indigo-400 bg-clip-text text-transparent font-sans">
            StockVision AI
          </h1>
          <p className="text-xs font-medium tracking-widest text-blue-400/80 uppercase font-mono">
            LSTM neural networks prediction
          </p>
        </div>

        {/* Sleek loading bar container */}
        <div className="w-56 h-1 bg-slate-900/80 rounded-full overflow-hidden border border-slate-800/30 relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_8px_rgba(99,102,241,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer detail */}
      <div className="absolute bottom-8 text-[10px] tracking-widest font-mono text-slate-500 uppercase">
        Academic graduation project
      </div>
    </div>
  );
}
