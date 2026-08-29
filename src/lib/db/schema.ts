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
    payoutWallet: varchar("payout_wallet", { length: 64 }),
    twitterHandle: varchar("twitter_handle", { length: 64 }),
    twitterVerified: boolean("twitter_verified").notNull().default(false),
    twitterVerifyCode: varchar("twitter_verify_code", { length: 64 }),
    twitterVerifyExpiry: timestamp("twitter_verify_expiry", { withTimezone: true }),
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
    clawpumpAgentId: varchar("clawpump_agent_id", { length: 64 }),
    clawpumpWalletAddress: varchar("clawpump_wallet_address", { length: 64 }),
    persona: text("persona"),
    modelName: varchar("model_name", { length: 64 }),
    isPublic: boolean("is_public").notNull().default(true),
    avatarUrl: text("avatar_url"),
    twitterVerified: boolean("twitter_verified").notNull().default(false),
    twitterHandle: varchar("twitter_handle", { length: 64 }),
    trustTier: varchar("trust_tier", { length: 20 }).notNull().default("unrated"),
    reputationScore: integer("reputation_score").notNull().default(0),
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
// BOUNTIES (post tasks, claim, complete — portfolio rewards)
// ──────────────────────────────────────────────
export const bounties = pgTable(
  "bounties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorUserId: uuid("creator_user_id").references(() => users.id),
    creatorName: varchar("creator_name", { length: 255 }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    rewardToken: varchar("reward_token", { length: 16 }).notNull().default("CLAW"),
    rewardAmount: varchar("reward_amount", { length: 64 }).notNull(),
    deliverable: text("deliverable"),
    status: varchar("status", { length: 20 }).notNull().default("open"), // open | in_progress | completed | disputed
    escrowWallet: text("escrow_wallet"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id),
    proofUrl: text("proof_url"),
    deadline: timestamp("deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bounties_status_idx").on(t.status), index("bounties_creator_idx").on(t.creatorUserId)]
);

// ──────────────────────────────────────────────
// AGENT REPUTATION (registry trust tiers)
// ──────────────────────────────────────────────
export const agentReputation = pgTable(
  "agent_reputation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id),
    userId: uuid("user_id").references(() => users.id),
    trustTier: varchar("trust_tier", { length: 20 }).notNull().default("unrated"), // unrated | bronze | silver | gold | platinum
    reputationScore: integer("reputation_score").notNull().default(0),
    totalTrades: integer("total_trades").notNull().default(0),
    totalLaunches: integer("total_launches").notNull().default(0),
    totalBounties: integer("total_bounties").notNull().default(0),
    completedBounties: integer("completed_bounties").notNull().default(0),
    twitterVerified: boolean("twitter_verified").notNull().default(false),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rep_agent_idx").on(t.agentId), index("rep_user_idx").on(t.userId)]
);

// ──────────────────────────────────────────────
// REWARD TASKS (treasure task system — bounty-style tasks)
// ──────────────────────────────────────────────
export const rewardTasks = pgTable(
  "reward_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    type: varchar("type", { length: 32 }).notNull(), // twitter_follow | twitter_post | buy_coin | holding | teach | custom
    rewardToken: varchar("reward_token", { length: 16 }).notNull().default("CLAW"),
    rewardAmount: varchar("reward_amount", { length: 64 }).notNull(),
    proofJson: jsonb("proof_json"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reward_tasks_slug_idx").on(t.slug), index("reward_tasks_active_idx").on(t.active)]
);

// ──────────────────────────────────────────────
// REWARD SUBMISSIONS (proof for tasks)
// ──────────────────────────────────────────────
export const rewardSubmissions = pgTable(
  "reward_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    taskId: uuid("task_id").references(() => rewardTasks.id),
    proofUrl: text("proof_url"),
    proofWallet: text("proof_wallet"),
    proofUsername: text("proof_username"),
    proofHash: varchar("proof_hash", { length: 128 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | verified | rejected
    adminNote: text("admin_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sub_task_idx").on(t.taskId), index("sub_user_idx").on(t.userId), uniqueIndex("sub_proof_hash_idx").on(t.proofHash)]
);

// ──────────────────────────────────────────────
// REWARD PAYMENTS (payout from treasury)
// ──────────────────────────────────────────────
export const rewardPayments = pgTable(
  "reward_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").references(() => rewardSubmissions.id).notNull(),
    userId: uuid("user_id").references(() => users.id),
    taskId: uuid("task_id").references(() => rewardTasks.id),
    token: varchar("token", { length: 16 }).notNull().default("CLAW"),
    amount: varchar("amount", { length: 64 }).notNull(),
    txSignature: text("tx_signature"),
    status: varchar("status", { length: 20 }).notNull().default("paid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reward_pay_submission_idx").on(t.submissionId)]
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
