import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";

export const protectedRoutes = new Elysia({ prefix: "/v1" })
    .derive(authMiddleware)

    .get("/profile", async ({ user, session }) => {
        return {
            message: "This is a protected endpoint",
            user: user,
            session: session,
            timestamp: new Date().toISOString()
        };
    })