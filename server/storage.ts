import { predictions, type Prediction, type InsertPrediction, users, type User, type InsertUser, authLogs } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getPredictions(userId?: string, limit?: number): Promise<Prediction[]>;
  getPredictionsBySymbol(symbol: string, userId?: string): Promise<Prediction[]>;
  updatePredictionOutcome(id: number, actualDirection: string, wasCorrect: number, actualPrice: number): Promise<void>;
  getUnvalidatedPredictions(): Promise<Prediction[]>;
  createAuthLog(log: {
    userId: string | null;
    username: string;
    eventType: string;
    ipAddress: string | null;
  }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createAuthLog(log: {
    userId: string | null;
    username: string;
    eventType: string;
    ipAddress: string | null;
  }): Promise<void> {
    await db.insert(authLogs).values(log);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [result] = await db.insert(predictions).values(prediction).returning();
    return result;
  }

  async getPredictions(userId?: string, limit = 50): Promise<Prediction[]> {
    if (userId) {
      return db
        .select()
        .from(predictions)
        .where(eq(predictions.userId, userId))
        .orderBy(desc(predictions.predictionDate))
        .limit(limit);
    }
    return db
      .select()
      .from(predictions)
      .orderBy(desc(predictions.predictionDate))
      .limit(limit);
  }

  async getPredictionsBySymbol(symbol: string, userId?: string): Promise<Prediction[]> {
    if (userId) {
      return db
        .select()
        .from(predictions)
        .where(
          and(
            eq(predictions.symbol, symbol),
            eq(predictions.userId, userId)
          )
        )
        .orderBy(desc(predictions.predictionDate));
    }
    return db
      .select()
      .from(predictions)
      .where(eq(predictions.symbol, symbol))
      .orderBy(desc(predictions.predictionDate));
  }

  async updatePredictionOutcome(
    id: number,
    actualDirection: string,
    wasCorrect: number,
    actualPrice: number
  ): Promise<void> {
    await db
      .update(predictions)
      .set({ actualDirection, wasCorrect, actualPrice })
      .where(eq(predictions.id, id));
  }

  async getUnvalidatedPredictions(): Promise<Prediction[]> {
    return db
      .select()
      .from(predictions)
      .where(isNull(predictions.wasCorrect))
      .orderBy(desc(predictions.predictionDate));
  }
}

export const storage = new DatabaseStorage();
