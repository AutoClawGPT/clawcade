import { NextRequest, NextResponse } from "next/server";
import { registerAgent } from "@/lib/agent";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/agents/register — Register a new agent
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Provide your authToken." },
      { status: 401 }
    );
  }

  const authToken = authHeader.slice(7);
  
  // Find user by authToken
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authToken, authToken))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid auth token" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { name, description, image, publicKey, secretKey, skills, clawpumpAgentId, clawpumpWalletAddress, persona, avatarUrl } = body;

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  try {
    const result = await registerAgent(user.id, {
      name,
      description,
      image,
      publicKey,
      secretKey,
      skills,
      clawpumpAgentId,
      clawpumpWalletAddress,
      persona,
      avatarUrl,
    });

    return NextResponse.json({
      success: true,
      agent: result,
      message: "Agent registered successfully. Save your agentToken securely.",
      warning: "Your agentToken is shown only once. Store it safely.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    );
  }
}
