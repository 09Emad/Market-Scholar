# StockVision - Local Setup Guide (Windows)

## Prerequisites

1. **Node.js** (v18 or higher) - https://nodejs.org
2. **Python** (v3.10 or higher) - https://python.org
3. **PostgreSQL** - https://postgresql.org/download/windows/
4. **Git** - https://git-scm.com

---

## Step 1: Clone the Project

```bash
git clone <your-repo-url>
cd Market-Scholar
```

## Step 2: Create `.env` File

Create a file named `.env` in the project root (same folder as `package.json`):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/stockvision
SESSION_SECRET=any-random-secret-text-here
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

## Step 3: Create PostgreSQL Database

Open a terminal and run:

```bash
psql -U postgres
CREATE DATABASE stockvision;
\q
```

## Step 4: Install Node.js Dependencies

```bash
npm install
```

## Step 5: Install Python Dependencies

It is recommended to use a virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r python_ml/requirements.txt
```

Make sure `python` is on your system PATH. You can verify with:
```bash
python --version
```

## Step 6: Edit `vite.config.ts` (Important!)

Open `vite.config.ts` and replace its entire content with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

This removes Replit-specific plugins that don't work locally.

## Step 7: Push Database Schema

```bash
npx drizzle-kit push
```

## Step 8: Run the Project

```bash
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## How It Works

- **Node.js server** runs on port `3000` (serves both frontend and API)
- **Python ML service** runs on port `5001` (started automatically by Node.js)
- The ML service trains an LSTM model per prediction request using live Yahoo Finance data

## Troubleshooting

### "DATABASE_URL must be set"
Make sure `.env` file exists in the project root and has the correct `DATABASE_URL`.

### "EADDRINUSE: address already in use"
Another process is using port 3000 or 5001. Kill it:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force
```

### ML service keeps restarting
Check that Python and all dependencies are installed:
```bash
python --version
pip install -r python_ml/requirements.txt
```

### Prediction shows "ML service unavailable"
The Python ML service might not have started yet. Wait a few seconds after `npm run dev` and try again. The ML service needs time to initialize.

### Replit plugins error
If you see errors about `@replit/vite-plugin-*`, make sure you replaced `vite.config.ts` content as described in Step 6.
