import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, Target, ShieldCheck, ArrowLeft, RefreshCw, BarChart3, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface AdminStatsResponse {
  stats: {
    totalUsers: number;
    totalPredictions: number;
    correctPredictions: number;
    totalValidated: number;
  };
  recentActivity: Array<{
    id: string;
    userId: string | null;
    username: string;
    eventType: string;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data, isLoading, refetch, isRefetching } = useQuery<AdminStatsResponse>({
    queryKey: ["/api/admin/stats"],
  });

  if (!user || !user.isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-indigo-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const stats = data?.stats;
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground p-4 md:p-8 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/30 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Database className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                System Overview
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">Real-time metrics and activity monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="bg-white/5 border-white/10 hover:bg-white/10 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="default" 
              onClick={() => setLocation("/")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/25"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit to App
            </Button>
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Stat Card 1 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card/40 backdrop-blur-xl border-white/5 overflow-hidden group hover:border-indigo-500/50 transition-all duration-300 shadow-xl hover:shadow-indigo-500/10 rounded-3xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">+12%</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Registered Users</p>
                <div className="text-4xl font-black text-foreground">{stats?.totalUsers || 0}</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stat Card 2 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card/40 backdrop-blur-xl border-white/5 overflow-hidden group hover:border-blue-500/50 transition-all duration-300 shadow-xl hover:shadow-blue-500/10 rounded-3xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">AI Models</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Predictions Generated</p>
                <div className="text-4xl font-black text-foreground">{stats?.totalPredictions || 0}</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stat Card 3 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card/40 backdrop-blur-xl border-white/5 overflow-hidden group hover:border-emerald-500/50 transition-all duration-300 shadow-xl hover:shadow-emerald-500/10 rounded-3xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Accuracy</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Correct Predictions</p>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-black text-emerald-400">{stats?.correctPredictions || 0}</div>
                  <div className="text-sm font-medium text-muted-foreground">/ {stats?.totalValidated || 0}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stat Card 4 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card/40 backdrop-blur-xl border-white/5 overflow-hidden group hover:border-purple-500/50 transition-all duration-300 shadow-xl hover:shadow-purple-500/10 rounded-3xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Status</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">System Health</p>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <div className="text-2xl font-black text-foreground">Online</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card/40 backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Activity Stream</h3>
                  <p className="text-sm text-muted-foreground">Recent events across the platform</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-5 font-semibold tracking-wider">Timestamp</th>
                    <th className="px-6 py-5 font-semibold tracking-wider">User Account</th>
                    <th className="px-6 py-5 font-semibold tracking-wider">Event Type</th>
                    <th className="px-6 py-5 font-semibold tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentActivity.map((log: any, index: number) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (index * 0.05) }}
                      key={log.id} 
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold uppercase">
                            {log.username.slice(0, 2)}
                          </div>
                          {log.username}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          log.eventType.includes("SUCCESS") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          log.eventType.includes("FAILED") ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}>
                          {log.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {log.ipAddress || "N/A"}
                      </td>
                    </motion.tr>
                  ))}
                  {recentActivity.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Activity className="w-8 h-8 opacity-20" />
                          <p>No recent activity found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
