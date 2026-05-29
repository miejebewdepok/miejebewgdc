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
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${protocol}://${host}`;
  }
  return request.nextUrl.origin;
}

function redirectToAuth(request: NextRequest, mode: string, error: string) {
  const url = new URL("/auth", getBaseUrl(request));
  url.searchParams.set("mode", mode);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
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
    return NextResponse.json({ error: "Intent auth tidak dikenal." }, { status: 404 });
  }

  const formData = await request.formData();
  const callbackURL = String(formData.get("callbackURL") ?? "/dashboard");
  const payload = {
    callbackURL,
    ...(intent === "sign-up"
      ? {
          name: String(formData.get("name") ?? ""),
        }
      : {}),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const hasMissingField = config.requiredFields.some(
    (field) => String(formData.get(field) ?? "").trim().length === 0
  );
  if (hasMissingField) {
    return redirectToAuth(request, config.mode, "Lengkapi dulu data akun yang wajib diisi.");
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
      return redirectToAuth(
        request,
        config.mode,
        authResult?.message ?? config.defaultError
      );
    }

    if (intent === "sign-up") {
      const successURL = new URL("/auth", getBaseUrl(request));
      successURL.searchParams.set("mode", "signin");
      successURL.searchParams.set(
        "success",
        "Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan dari taufiqrusdhi.ez@gmail.com. Silakan hubungi pemilik untuk mengaktifkan akses masuk Anda."
      );
      return NextResponse.redirect(successURL, { status: 303 });
    }

    const redirectTarget = new URL(authResult?.url ?? callbackURL, getBaseUrl(request));
    const response = NextResponse.redirect(redirectTarget, { status: 303 });
    appendSetCookieHeaders(authResponse, response);
    return response;
  } catch {
    return redirectToAuth(request, config.mode, config.defaultError);
  }
}
