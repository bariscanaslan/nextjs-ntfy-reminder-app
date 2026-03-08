import { NextResponse } from "next/server";
import { ok } from "@/lib/utils/http";
import { verifySession, COOKIE_NAME } from "@/lib/auth/session";
import { cookies } from "next/headers";

/**
 * Returns the iCal feed token so the client can build the correct feed URL.
 * This route is session-protected — only authenticated users can retrieve the token.
 */
export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const icalSecret = process.env.ICAL_SECRET ?? null;
  return ok({ token: icalSecret });
}
