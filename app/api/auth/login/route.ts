import { NextRequest, NextResponse } from "next/server";
import { createSession, COOKIE_NAME, MAX_AGE_SEC } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const validUsername = process.env.APP_USERNAME ?? "admin";
    const validPassword = process.env.APP_PASSWORD;

    if (!validPassword) {
      return NextResponse.json(
        { error: "Server is not configured. Set APP_PASSWORD in your environment." },
        { status: 500 }
      );
    }

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username !== validUsername ||
      password !== validPassword
    ) {
      // Uniform error — don't reveal which field is wrong
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = await createSession(username);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE_SEC,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
