import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { max: 1 });

  console.log("⏳ Running migrations...");

  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("✅ Migrations complete!");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
