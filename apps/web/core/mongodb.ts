// MongoDB client and models for the application
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// Connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || '';

let client: MongoClient | null = null;
let db: Db | null = null;

// User document interface
export interface UserDoc {
  _id?: ObjectId;
  odId: string;            // telegram userId  
  odname?: string;      // @username
  firstName?: string;
  lastName?: string;
  authDate?: number;
  createdAt: Date;
  lastVisit: Date;
  // Subscription
  isPro: boolean;
  proExpiry?: Date;
  proStars?: number;       // how many stars paid
  // Quotas
  freeUsedToday: number;
  lastQuotaReset: string;  // YYYY-MM-DD
  // Additional data
  birthDate?: string;
}

// Payment/Transaction log
// ВАЖНО: telegram_payment_charge_id нужен для возврата средств (refund)
export interface PaymentDoc {
  _id?: ObjectId;
  odId: string;
  odname?: string;
  stars: number;
  currency?: string;
  // КРИТИЧНО: сохраняем для refund
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  invoicePayload?: string;
  createdAt: Date;
  expiresAt: Date;
  refundedAt?: Date;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

// Analytics event
export interface AnalyticsDoc {
  _id?: ObjectId;
  odId: string;
  odname?: string;
  action: string;
  page?: string;
  createdAt: Date;
  meta?: Record<string, any>;
}

// Connect to MongoDB (singleton)
export async function connectMongo(): Promise<{ client: MongoClient; db: Db }> {
  if (db && client) return { client, db };
  
  if (!MONGODB_URI) {
    console.warn('[MongoDB] MONGODB_URI not set, using mock mode');
    throw new Error('MONGODB_URI not configured');
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(); // uses default db from connection string
    console.log('[MongoDB] Connected successfully');
    
    // Create indexes
    await ensureIndexes(db);
    
    return { client, db };
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    throw error;
  }
}

async function ensureIndexes(database: Db) {
  try {
    const users = database.collection('users');
    await users.createIndex({ odId: 1 }, { unique: true });
    await users.createIndex({ odname: 1 });
    await users.createIndex({ isPro: 1 });
    await users.createIndex({ proExpiry: 1 });

    const payments = database.collection('payments');
    await payments.createIndex({ odId: 1 });
    await payments.createIndex({ createdAt: -1 });

    const analytics = database.collection('analytics');
    await analytics.createIndex({ odId: 1 });
    await analytics.createIndex({ createdAt: -1 });
    await analytics.createIndex({ action: 1 });
  } catch (e) {
    console.warn('[MongoDB] Index creation warning:', e);
  }
}

// Get collections
export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const { db: database } = await connectMongo();
  return database.collection<UserDoc>('users');
}

export async function getPaymentsCollection(): Promise<Collection<PaymentDoc>> {
  const { db: database } = await connectMongo();
  return database.collection<PaymentDoc>('payments');
}

export async function getAnalyticsCollection(): Promise<Collection<AnalyticsDoc>> {
  const { db: database } = await connectMongo();
  return database.collection<AnalyticsDoc>('analytics');
}

// ==================== User Operations ====================

export async function findOrCreateUser(odId: string, profile?: {
  odname?: string;
  firstName?: string;
  lastName?: string;
  authDate?: number;
}): Promise<UserDoc> {
  const users = await getUsersCollection();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const existingUser = await users.findOne({ odId });
  
  if (!existingUser) {
    const newUser: UserDoc = {
      odId,
      odname: profile?.odname,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      authDate: profile?.authDate,
      createdAt: now,
      lastVisit: now,
      isPro: false,
      freeUsedToday: 0,
      lastQuotaReset: today,
    };
    await users.insertOne(newUser);
    return newUser;
  } else {
    // Update last visit and profile
    const updates: any = { lastVisit: now };
    if (profile?.odname) updates.odname = profile.odname;
    if (profile?.firstName) updates.firstName = profile.firstName;
    if (profile?.lastName) updates.lastName = profile.lastName;
    await users.updateOne({ odId }, { $set: updates });
    return { ...existingUser, lastVisit: now } as UserDoc;
  }
}

export async function getUser(odId: string): Promise<UserDoc | null> {
  const users = await getUsersCollection();
  const doc = await users.findOne({ odId });
  return doc as UserDoc | null;
}

export async function updateUser(odId: string, updates: Partial<UserDoc>): Promise<void> {
  const users = await getUsersCollection();
  await users.updateOne({ odId }, { $set: updates });
}

// ==================== Quota Operations ====================

const FREE_MESSAGES_PER_DAY = Number(process.env.FREE_MESSAGES_PER_DAY || 2);

export async function checkAndUseQuota(odId: string): Promise<{ allowed: boolean; remaining: number; isPro: boolean }> {
  const users = await getUsersCollection();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  let user = await users.findOne({ odId });
  
  if (!user) {
    // Auto-create guest user
    const newUser = await findOrCreateUser(odId);
    user = newUser as any;
  }

  // Check if PRO subscription is active
  const isPro = user!.isPro && user!.proExpiry && new Date(user!.proExpiry) > now;

  if (isPro) {
    return { allowed: true, remaining: 999, isPro: true };
  }

  // Reset quota if new day
  if (user!.lastQuotaReset !== today) {
    await users.updateOne({ odId }, { 
      $set: { freeUsedToday: 0, lastQuotaReset: today } 
    });
    user!.freeUsedToday = 0;
  }

  const remaining = Math.max(0, FREE_MESSAGES_PER_DAY - user!.freeUsedToday);
  
  if (remaining > 0) {
    await users.updateOne({ odId }, { $inc: { freeUsedToday: 1 } });
    return { allowed: true, remaining: remaining - 1, isPro: false };
  }

  return { allowed: false, remaining: 0, isPro: false };
}

export async function getQuotaStatus(odId: string): Promise<{ used: number; limit: number; isPro: boolean; proExpiry?: Date }> {
  const user = await getUser(odId);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (!user) {
    return { used: 0, limit: FREE_MESSAGES_PER_DAY, isPro: false };
  }

  const isPro = user.isPro && user.proExpiry && new Date(user.proExpiry) > now;
  const used = user.lastQuotaReset === today ? user.freeUsedToday : 0;

  return { 
    used, 
    limit: FREE_MESSAGES_PER_DAY, 
    isPro: !!isPro,
    proExpiry: user.proExpiry 
  };
}

// ==================== Subscription Operations ====================

const PRO_PRICE_STARS = 350;
const PRO_DURATION_DAYS = 30;

export async function grantProSubscription(odId: string, stars: number = PRO_PRICE_STARS): Promise<{ success: boolean; expiresAt: Date }> {
  const users = await getUsersCollection();
  const payments = await getPaymentsCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Update user
  await users.updateOne(
    { odId },
    { 
      $set: { 
        isPro: true, 
        proExpiry: expiresAt,
        proStars: stars 
      } 
    },
    { upsert: true }
  );

  // Log payment
  const user = await users.findOne({ odId });
  await payments.insertOne({
    odId,
    odname: user?.odname,
    stars,
    createdAt: now,
    expiresAt,
    status: 'completed'
  });

  return { success: true, expiresAt };
}

export async function revokeProSubscription(odId: string): Promise<void> {
  const users = await getUsersCollection();
  await users.updateOne(
    { odId },
    { $set: { isPro: false, proExpiry: undefined, proStars: undefined } }
  );
}

// ==================== Analytics Operations ====================

export async function logAnalytics(odId: string, action: string, meta?: Record<string, any>): Promise<void> {
  try {
    const analytics = await getAnalyticsCollection();
    const user = await getUser(odId);
    await analytics.insertOne({
      odId,
      odname: user?.odname,
      action,
      createdAt: new Date(),
      meta
    });
  } catch (e) {
    console.warn('[MongoDB] Analytics log failed:', e);
  }
}

// ==================== Admin Queries ====================

export async function getAllUsers(limit: number = 1000): Promise<UserDoc[]> {
  const users = await getUsersCollection();
  return users.find({}).sort({ lastVisit: -1 }).limit(limit).toArray();
}

export async function getProUsers(): Promise<UserDoc[]> {
  const users = await getUsersCollection();
  const now = new Date();
  return users.find({ isPro: true, proExpiry: { $gt: now } }).sort({ proExpiry: 1 }).toArray();
}

export async function getRecentPayments(limit: number = 100): Promise<PaymentDoc[]> {
  const payments = await getPaymentsCollection();
  return payments.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function getAnalyticsStats(): Promise<{
  totalUsers: number;
  activeToday: number;
  proUsers: number;
  totalPayments: number;
}> {
  const users = await getUsersCollection();
  const payments = await getPaymentsCollection();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [totalUsers, activeToday, proUsers, totalPayments] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ lastQuotaReset: today }),
    users.countDocuments({ isPro: true, proExpiry: { $gt: now } }),
    payments.countDocuments({ status: 'completed' })
  ]);

  return { totalUsers, activeToday, proUsers, totalPayments };
}
