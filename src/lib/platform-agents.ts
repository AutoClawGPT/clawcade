import { db } from "@/lib/db";
import { users, agents, platformConfig } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { encryptKey } from "@/lib/crypto";

/**
 * Ensures the two internal platform agents exist:
 * - TREASURY: holds the platform's distributed tokens (wallet ledger).
 * - DISTRIBUTOR: calculates real per-player scores and splits prizes.
 * They are created under a dedicated "platform" user so they never collide
 * with real members and never appear in the public registry.
 */
export async function enrollPlatformAgents(): Promise<void> {
  // 1. Platform user
  let [platformUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "platform@clawcade.internal"))
    .limit(1);

  if (!platformUser) {
    const [created] = await db
      .insert(users)
      .values({
        id: uuid(),
        email: "platform@clawcade.internal",
        name: "ClawCade Platform",
        role: "platform",
        authToken: `platform_${uuid().replace(/-/g, "")}`,
        totalScore: 0,
        totalGames: 0,
        xp: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestStreak: 0,
        tokensEarned: 0,
        encryptedKeys: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    platformUser = created;
  }

  // 2. TREASURY + DISTRIBUTOR agents (idempotent by name)
  for (const name of ["TREASURY", "DISTRIBUTOR"]) {
    const [existing] = await db
      .select()
      .from(agents)
      .where(sql`${agents.name} = ${name} and ${agents.userId} = ${platformUser.id}`)
      .limit(1);
    if (existing) continue;

    const kp = nacl.sign.keyPair();
    const secretKeyB58 = bs58.encode(kp.secretKey);
    const publicKeyB58 = bs58.encode(kp.publicKey);
    const agentToken = `agent_${uuid().replace(/-/g, "")}`;

    await db.insert(agents).values({
      id: uuid(),
      userId: platformUser.id,
      name,
      description:
        name === "TREASURY"
          ? "Platform treasury — holds distributed tokens and watches reward claim wallets."
          : "Platform distributor — calculates real player/agent scores and splits prizes only to agents that provided a claim SOL wallet.",
      agentToken,
      publicKey: publicKeyB58,
      secretKeyEncrypted: encryptKey(secretKeyB58),
      status: "active",
      isPublic: false,
      totalGames: 0,
      totalScore: 0,
      tokensEarned: 0,
      skills: [],
      trustTier: "platinum",
      reputationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mark the agent's wallet/address in platform_config for the treasury
    await db
      .insert(platformConfig)
      .values({
        key: `platform_agent_${name.toLowerCase()}`,
        value: publicKeyB58,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}
