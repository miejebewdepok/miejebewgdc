import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { createAuthMiddleware, APIError } from "better-auth/api";

const globalForAuth = globalThis as typeof globalThis & {
  __warungosAuthPool?: Pool;
};

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
    origins.add(new URL(request.url).origin);
  }

  if (origins.size === 0) {
    origins.add("http://localhost:3000");
  }

  return Array.from(origins);
}

function resolveAuthBaseUrl() {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
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

function getAuthPool() {
  if (!globalForAuth.__warungosAuthPool) {
    let connStr =
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/warungos";

    // Self-healing: redirect Supabase session mode (port 5432) to transaction mode (port 6543)
    // to avoid EMAXCONNSESSION errors on serverless platforms like Vercel.
    if (connStr.includes("pooler.supabase.com:5432")) {
      connStr = connStr.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    }

    globalForAuth.__warungosAuthPool = new Pool({
      connectionString: connStr,
      max: 2,
      idleTimeoutMillis: 10000,
    });
  }

  return globalForAuth.__warungosAuthPool;
}

export const auth = betterAuth({
  database: getAuthPool(),
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
          const pool = getAuthPool();
          try {
            const res = await pool.query(
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
