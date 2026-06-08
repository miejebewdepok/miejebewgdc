import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { Pool } from "pg";

const globalForAuth = globalThis as typeof globalThis & {
  __betterAuthPool?: Pool;
};

function createAuthPool() {
  let connStr =
    process.env.BETTER_AUTH_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "";

  // Validate the connection string format; if invalid or empty, fall back
  if (!connStr.startsWith("postgres://") && !connStr.startsWith("postgresql://")) {
    console.warn("BETTER_AUTH_DB_URL is empty or invalid, falling back to DATABASE_URL...");
    connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  }

  if (!connStr.startsWith("postgres://") && !connStr.startsWith("postgresql://")) {
    console.warn("DATABASE_URL is empty or invalid, falling back to local...");
    connStr = "postgresql://postgres:postgres@127.0.0.1:5432/warungos";
  }

  // Mask sensitive credentials for logging
  const maskedConn = connStr.replace(/:[^:@]+@/, ":***@");
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    console.log("Resolved authPool connection string:", maskedConn);
  }

  if (connStr.includes("pooler.supabase.com:5432")) {
    connStr = connStr.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }

  return new Pool({
    connectionString: connStr,
    max: 1, // Separate pool for Better Auth queries to avoid Vercel serverless connection contention
    idleTimeoutMillis: 1000,
    ssl: { rejectUnauthorized: false }, // Supabase sometimes presents a self-signed intermediate in the TLS chain
  });
}

export const authPool = globalForAuth.__betterAuthPool ?? createAuthPool();
globalForAuth.__betterAuthPool = authPool;

function toOrigin(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value).origin;
  }

  return `https://${value}`;
}

function getTrustedAuthOrigins(request?: Request) {
  const origins = new Set<string>();

  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ]) {
    if (!value) {
      continue;
    }

    origins.add(toOrigin(value));
  }

  if (request) {
    try {
      origins.add(new URL(request.url).origin);
    } catch (e) {}
  }

  if (origins.size === 0) {
    origins.add("http://localhost:3000");
  }

  // Always trust production custom domain and Capacitor webview origins
  origins.add("https://miejebew.my.id");
  origins.add("http://localhost");
  origins.add("capacitor://localhost");
  origins.add("http://localhost:3000");

  return Array.from(origins);
}

function resolveAuthBaseUrl() {
  const envUrl = process.env.BETTER_AUTH_URL;
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";
  if (envUrl && !(isVercel && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")))) {
    return envUrl;
  }

  // If running in production (e.g. on Vercel), force base URL to use the custom domain
  // to prevent it from resolving to the localhost value defined in the repo's .env file.
  if (process.env.NODE_ENV === "production" || isVercel) {
    return "https://miejebew.my.id";
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_BRANCH_URL ??
    process.env.VERCEL_URL;

  if (vercelHost) {
    // Vercel exposes hostnames without a protocol.
    return `https://${vercelHost}`;
  }

  return "http://localhost:3000";
}

export const auth = betterAuth({
  database: authPool,
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "warungos-dev-secret-please-change-this-in-production",
  baseURL: resolveAuthBaseUrl(),
  trustedOrigins: async (request) => getTrustedAuthOrigins(request),
  user: {
    additionalFields: {
      isApproved: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // Do not log in immediately after registration, wait for approval
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Intercept the email/password sign-in process
      if (ctx.path === "/sign-in/email") {
        const email = ctx.body?.email;
        if (email) {
          try {
            const res = await authPool.query(
              'SELECT "isApproved" FROM "user" WHERE email = $1 LIMIT 1',
              [email.toLowerCase().trim()]
            );
            if (res.rows.length > 0) {
              const user = res.rows[0];
              // Block sign-in if the user is explicitly set to not approved
              if (user.isApproved === false) {
                throw new APIError("FORBIDDEN", {
                  message: "Your account is pending approval by RP Group. Please contact RP Group to activate your access.",
                });
              }
            }
          } catch (err: any) {
            if (err instanceof APIError) {
              throw err;
            }
            console.error("Error in before sign-in hook:", err);
          }
        }
      }
    }),
  },
});
