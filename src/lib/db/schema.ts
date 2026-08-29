import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────
// USERS
// ──────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    image: text("image"),
    walletAddress: varchar("wallet_address", { length: 64 }),
    publicKey: varchar("public_key", { length: 64 }),
    authToken: varchar("auth_token", { length: 128 }),
    role: varchar("role", { length: 20 }).notNull().default("user"), // user | admin | platform
    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    totalScore: integer("total_score").notNull().default(0),
    totalGames: integer("total_games").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    winStreak: integer("win_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    tokensEarned: real("tokens_earned").notNull().default(0),
    encryptedKeys: jsonb("encrypted_keys"), // { clawpumpApiKey, ... }
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_auth_token_idx").on(t.authToken),
    index("users_wallet_idx").on(t.walletAddress),
  ]
);

// ──────────────────────────────────────────────
// AGENTS
// ──────────────────────────────────────────────
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    image: text("image"),
    agentToken: varchar("agent_token", { length: 128 }).notNull(),
    publicKey: varchar("public_key", { length: 64 }).notNull(),
    secretKeyEncrypted: text("secret_key_encrypted"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | inactive | banned
    totalGames: integer("total_games").notNull().default(0),
    totalScore: integer("total_score").notNull().default(0),
    tokensEarned: real("tokens_earned").notNull().default(0),
    skills: jsonb("skills"), // string[]
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("agents_agent_token_idx").on(t.agentToken),
    uniqueIndex("agents_public_key_idx").on(t.publicKey),
    index("agents_user_id_idx").on(t.userId),
  ]
);

// ──────────────────────────────────────────────
// GAMES
// ──────────────────────────────────────────────
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 64 }),
    difficulty: varchar("difficulty", { length: 20 }).default("medium"),
    maxScore: integer("max_score").notNull().default(10000),
    isActive: boolean("is_active").notNull().default(true),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("games_name_idx").on(t.name),
    uniqueIndex("games_slug_idx").on(t.slug),
  ]
);

// ──────────────────────────────────────────────
// SCORES
// ──────────────────────────────────────────────
export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    score: integer("score").notNull(),
    duration: integer("duration"), // seconds
    proof: text("proof"), // SHA-256 hash
    verified: boolean("verified").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scores_user_id_idx").on(t.userId),
    index("scores_game_id_idx").on(t.gameId),
    index("scores_agent_id_idx").on(t.agentId),
    index("scores_user_game_idx").on(t.userId, t.gameId),
    index("scores_created_at_idx").on(t.createdAt),
  ]
);

// ──────────────────────────────────────────────
// REWARDS
// ──────────────────────────────────────────────
export const rewards = pgTable(
  "rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(), // hourly | daily | weekly | treasure
    amount: real("amount").notNull(),
    token: varchar("token", { length: 16 }).notNull().default("CLAW"), // CLAW | ANSEM
    txSignature: text("tx_signature"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | distributed | failed
    rank: integer("rank"),
    period: varchar("period", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rewards_user_id_idx").on(t.userId),
    index("rewards_type_idx").on(t.type),
    index("rewards_status_idx").on(t.status),
  ]
);

// ──────────────────────────────────────────────
// LEADERBOARD
// ──────────────────────────────────────────────
export const leaderboard = pgTable(
  "leaderboard",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: varchar("period", { length: 20 }).notNull(), // daily | weekly | monthly | alltime
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    score: integer("score").notNull().default(0),
    rank: integer("rank"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("leaderboard_user_id_idx").on(t.userId),
    index("leaderboard_period_idx").on(t.period),
    index("leaderboard_period_game_idx").on(t.period, t.gameId),
    index("leaderboard_rank_idx").on(t.rank),
  ]
);

// ──────────────────────────────────────────────
// TREASURE DROPS
// ──────────────────────────────────────────────
export const treasureDrops = pgTable(
  "treasure_drops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    winners: jsonb("winners"), // { top1: userId, top2: userId, top3: userId }
    amounts: jsonb("amounts"), // { top1: 1000, top2: 500, top3: 250 }
    token: varchar("token", { length: 16 }).notNull().default("CLAW"),
    period: varchar("period", { length: 64 }),
    distributedAt: timestamp("distributed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("treasure_drops_game_id_idx").on(t.gameId)]
);

// ──────────────────────────────────────────────
// PLATFORM CONFIG
// ──────────────────────────────────────────────
export const platformConfig = pgTable(
  "platform_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 255 }).notNull(),
    value: text("value"),
    encrypted: boolean("encrypted").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("platform_config_key_idx").on(t.key)]
);

// ──────────────────────────────────────────────
// REGISTRATIONS
// ──────────────────────────────────────────────
export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // human | agent
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
    proof: text("proof"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("registrations_user_id_idx").on(t.userId),
    index("registrations_status_idx").on(t.status),
  ]
);

// ──────────────────────────────────────────────
// NEXTAUTH SESSIONS
// ──────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("sessions_session_token_idx").on(t.sessionToken)]
);

// ──────────────────────────────────────────────
// NEXTAUTH ACCOUNTS
// ──────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  },
  (t) => [uniqueIndex("accounts_provider_account_idx").on(t.provider, t.providerAccountId)]
);

// ──────────────────────────────────────────────
// RELATIONS
// ──────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
  scores: many(scores),
  rewards: many(rewards),
  leaderboardEntries: many(leaderboard),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, { fields: [agents.userId], references: [users.id] }),
  scores: many(scores),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  scores: many(scores),
  leaderboardEntries: many(leaderboard),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
  user: one(users, { fields: [scores.userId], references: [users.id] }),
  game: one(games, { fields: [scores.gameId], references: [games.id] }),
  agent: one(agents, { fields: [scores.agentId], references: [agents.id] }),
}));

export const rewardsRelations = relations(rewards, ({ one }) => ({
  user: one(users, { fields: [rewards.userId], references: [users.id] }),
}));

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  user: one(users, { fields: [leaderboard.userId], references: [users.id] }),
  game: one(games, { fields: [leaderboard.gameId], references: [games.id] }),
}));
