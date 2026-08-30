import { findUserByEmail, findAgentByName, createUser, createAgent, upsertPlatformConfig, newId } from "@/lib/db/clickhouse-store";
import { encryptKey } from "@/lib/crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";

export async function enrollPlatformAgents(): Promise<void> {
  let platformUser = await findUserByEmail("platform@clawcade.internal");
  if (!platformUser) {
    platformUser = await createUser({
      id: newId(),
      email: "platform@clawcade.internal",
      name: "ClawCade Platform",
      role: "platform",
      authToken: "platform_" + newId().replace(/-/g, ""),
      totalScore: 0, totalGames: 0, xp: 0,
      encryptedKeys: {},
    });
  }
  if (!platformUser) return;

  for (const name of ["TREASURY", "DISTRIBUTOR"]) {
    const existing = await findAgentByName(name);
    if (existing) continue;

    const kp = nacl.sign.keyPair();
    const secretKeyB58 = bs58.encode(kp.secretKey);
    const publicKeyB58 = bs58.encode(kp.publicKey);
    const agentToken = "agent_" + newId().replace(/-/g, "");

    await createAgent({
      id: newId(),
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
      skills: [],
      totalGames: 0,
      totalScore: 0,
    });

    await upsertPlatformConfig("platform_agent_" + name.toLowerCase(), publicKeyB58);
  }
}
