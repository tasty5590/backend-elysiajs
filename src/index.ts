import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { db, closeConnection } from "./db/client";
import { user } from "./db/schema";
import { auth } from "./auth";
import { authRoutes } from "./routes/auth";
import { protectedRoutes } from "./routes/protected";
import { cleanupExpiredSessions } from "./utils/session-cleanup";

const app = new Elysia()
  .use(cors({
    origin: true, // Allow all origins for mobile app - configure specifically in production
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  // Add cron job for session cleanup - runs every hour
  .use(cron({
    name: "session-cleanup",
    pattern: "0 * * * *", // Every hour at minute 0
    run: async () => {
      await cleanupExpiredSessions();
    },
    protect: true // Prevent overlapping executions
  }))
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    uptime: process.uptime()
  }))
  .get("/db-health", async () => {
    try {
      // Test database connection by running a simple query
      const result = await db.select().from(user).limit(1);
      return {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      };
    }
  })
  // Mount better-auth API routes
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .use(authRoutes)
  .use(protectedRoutes)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});
