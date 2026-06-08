import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const AUTH_INTENTS = {
  "sign-in": {
    authPath: "/api/auth/sign-in/email",
    mode: "signin",
    defaultError: "Gagal masuk ke dashboard.",
    requiredFields: ["email", "password"] as const,
  },
  "sign-up": {
    authPath: "/api/auth/sign-up/email",
    mode: "signup",
    defaultError: "Gagal membuat akun baru.",
    requiredFields: ["name", "email", "password"] as const,
  },
} as const;

type Intent = keyof typeof AUTH_INTENTS;

function getBaseUrl(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const isCapacitor = host.includes("localhost") || host.includes("127.0.0.1") || !host;

  if (isCapacitor) {
    const envUrl = process.env.BETTER_AUTH_URL;
    const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";
    if (envUrl && !(isVercel && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")))) {
      return envUrl;
    }

    if (process.env.NODE_ENV === "production" || isVercel) {
      return "https://miejebew.my.id";
    }
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${protocol}://${host}`;
  }
  return request.nextUrl.origin;
}

function returnError(mode: string, error: string) {
  return NextResponse.json({ success: false, mode, error }, { status: 400 });
}

function appendSetCookieHeaders(source: Response, target: NextResponse) {
  const responseHeaders = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof responseHeaders.getSetCookie === "function"
      ? responseHeaders.getSetCookie()
      : (() => {
          const setCookie = source.headers.get("set-cookie");
          return setCookie ? [setCookie] : [];
        })();

  for (const value of setCookies) {
    target.headers.append("set-cookie", value);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ intent: string }> }
) {
  const { intent } = await params;
  const config = AUTH_INTENTS[intent as Intent];

  if (!config) {
    return NextResponse.json({ success: false, error: "Intent auth tidak dikenal." }, { status: 404 });
  }

  const formData = await request.formData();
  const callbackURL = String(formData.get("callbackURL") ?? "/dashboard");
  const payload = {
    callbackURL,
    ...(intent === "sign-up"
      ? {
          name: String(formData.get("name") ?? ""),
        }
      : {
          rememberMe: true,
        }),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const hasMissingField = config.requiredFields.some(
    (field) => String(formData.get(field) ?? "").trim().length === 0
  );
  if (hasMissingField) {
    return returnError(config.mode, "Lengkapi dulu data akun yang wajib diisi.");
  }

  const authURL = new URL(config.authPath, getBaseUrl(request));

  try {
    const authRequest = new Request(authURL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: getBaseUrl(request),
      },
      body: JSON.stringify(payload),
    });

    const authResponse = await auth.handler(authRequest);

    const authResult = (await authResponse.json().catch(() => null)) as
      | { message?: string; url?: string | null }
      | null;

    if (!authResponse.ok) {
      console.error("Auth response not OK:", {
        status: authResponse.status,
        result: authResult,
      });
      return returnError(
        config.mode,
        authResult?.message ?? config.defaultError
      );
    }

    if (intent === "sign-up") {
      const successMsg = "Registration successful! Your account is pending approval by RP Group. Please contact RP Group to activate your access.";
      return NextResponse.json({ success: true, message: successMsg, mode: "signin" });
    }

    let redirectTarget = authResult?.url ?? callbackURL;
    if (redirectTarget.startsWith("http://") || redirectTarget.startsWith("https://")) {
      try {
        const parsedUrl = new URL(redirectTarget);
        redirectTarget = parsedUrl.pathname + parsedUrl.search;
      } catch (e) {
        redirectTarget = callbackURL;
      }
    }
    const response = NextResponse.json({ success: true, redirect: redirectTarget });
    appendSetCookieHeaders(authResponse, response);
    return response;
  } catch (error: any) {
    console.error("Auth intent route catch error:", error);
    return returnError(config.mode, error?.message ? `Error: ${error.message}` : config.defaultError);
  }
}

