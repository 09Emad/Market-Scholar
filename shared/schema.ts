import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const predictions = pgTable("predictions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").references(() => users.id),
  symbol: text("symbol").notNull(),
  predictionDate: timestamp("prediction_date").notNull().defaultNow(),
  targetDate: text("target_date").notNull(),
  targetExpiryAt: text("target_expiry_at"),
  direction: text("direction").notNull(),
  confidence: real("confidence").notNull(),
  currentPrice: real("current_price"),
  sentimentScore: real("sentiment_score"),
  factors: jsonb("factors"),
  actualDirection: text("actual_direction"),
  actualPrice: real("actual_price"),
  wasCorrect: integer("was_correct"),
});

export const authLogs = pgTable("auth_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  username: text("username").notNull(),
  eventType: text("event_type").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
  })
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={[\]}|:;"'<>,.?/~`]).*$/,
        "Password must contain uppercase, lowercase, number, and special character"
      ),
  });

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});


export const insertPredictionSchema = createInsertSchema(predictions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export const stockQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  previousClose: z.number(),
  volume: z.number(),
  marketCap: z.number().optional(),
  pe: z.number().optional(),
  week52High: z.number().optional(),
  week52Low: z.number().optional(),
  avgVolume: z.number().optional(),
});

export const newsArticleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string(),
  source: z.string(),
  publishedAt: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  sentimentScore: z.number().optional(),
});

export const analysisReportSectionSchema = z.object({
  title: z.string(),
  icon: z.string(),
  content: z.string(),
});

export const predictionResultSchema = z.object({
  symbol: z.string(),
  direction: z.enum(["up", "down"]),
  confidence: z.number(),
  targetDate: z.string(),
  factors: z.object({
    technicalScore: z.number(),
    sentimentScore: z.number(),
    volumeSignal: z.string(),
    priceAction: z.string(),
    newsImpact: z.string(),
  }),
  modelMetrics: z.object({
    accuracy: z.number(),
    precision: z.number(),
    recall: z.number(),
    f1Score: z.number(),
  }),
  featureImportance: z.array(z.object({
    feature: z.string(),
    importance: z.number(),
  })),
  analysisReport: z.array(analysisReportSectionSchema).optional(),
  explanation: z.object({
    direction: z.enum(["up", "down"]),
    decisionConfidence: z.number(),
    technicalReasoning: z.array(z.string()),
    newsAlignment: z.enum(["supportive", "opposing", "neutral"]),
    newsReasoning: z.array(z.string()),
    combinedView: z.string(),
    riskFlags: z.array(z.string()),
    invalidations: z.array(z.string()),
    finalNote: z.string(),
    usedFallback: z.boolean(),
  }).optional(),
});

export type StockQuote = z.infer<typeof stockQuoteSchema>;
export type NewsArticle = z.infer<typeof newsArticleSchema>;
export type PredictionResult = z.infer<typeof predictionResultSchema>;
