import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASIC_AUTH_HEADER = 'Basic realm="SEOAOE Admin"';

function decodeBasicAuth(header: string): string | null {
  try {
    const base64 = header.split(" ")[1] ?? "";
    return atob(base64);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_BASIC_AUTH;
  if (!expected) {
    // No credentials configured; allow access (useful for local dev)
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": BASIC_AUTH_HEADER },
    });
  }

  const credentials = decodeBasicAuth(authorization);
  if (!credentials || credentials !== expected) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": BASIC_AUTH_HEADER },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
