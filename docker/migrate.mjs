import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run self-hosted migrations");
}

try {
  await migrate(drizzle(process.env.DATABASE_URL), {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
  console.log("AssetMaster: database migrations are up to date.");
} catch (error) {
  console.error(
    "AssetMaster: database migration failed. The application will not start.",
    error instanceof Error ? error.message : "unknown error"
  );
  process.exitCode = 1;
}
