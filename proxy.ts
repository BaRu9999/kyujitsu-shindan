import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LIFF_SOURCES = new Set(["line", "poster", "table"]);

export function proxy(request: NextRequest) {
  const liffState = request.nextUrl.searchParams.get("liff.state");
  if (!liffState) return NextResponse.next();

  try {
    const stateUrl = new URL(liffState, request.url);
    const stateSource = stateUrl.searchParams.get("source");
    const currentSource = request.nextUrl.searchParams.get("source");

    if (!stateSource || !LIFF_SOURCES.has(stateSource) || stateSource === currentSource) {
      return NextResponse.next();
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.set("source", stateSource);
    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/",
};
