/**
 * "mock" (default): sample records in browser memory and the mock sign-in.
 * "api": real local backend with server sessions. Set NEXT_PUBLIC_DATA_MODE=api (npm run dev:api).
 */
export const DATA_MODE: "mock" | "api" = process.env.NEXT_PUBLIC_DATA_MODE === "api" ? "api" : "mock";
