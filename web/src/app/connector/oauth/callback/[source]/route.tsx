import { INTERNAL_URL } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

// TODO: deprecate this and just go directly to the backend via /api/...
// For some reason Egnyte doesn't work when using /api, so leaving this as is for now
// If we do try and remove this, make sure we test the Egnyte connector oauth flow
export async function GET(request: NextRequest) {
  try {
    const backendUrl = new URL(INTERNAL_URL);
    const source = request.nextUrl.pathname.split("/").pop();
    if (!source) {
      return NextResponse.json(
        { message: "Missing connector source in OAuth callback." },
        { status: 400 }
      );
    }

    const backendBasePath =
      backendUrl.pathname === "/"
        ? ""
        : backendUrl.pathname.replace(/\/$/, "");
    backendUrl.pathname = `${backendBasePath}/manage/connectors/${source}/oauth/callback`;
    backendUrl.search = request.nextUrl.search;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: request.headers,
      body: request.body,
      signal: request.signal,
      // @ts-ignore
      duplex: "half",
    });

    const responseData = await response.json();
    if (responseData.redirect_url) {
      return NextResponse.redirect(responseData.redirect_url);
    }

    return new NextResponse(JSON.stringify(responseData), {
      status: response.status,
      headers: response.headers,
    });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        message: "Proxy error",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
