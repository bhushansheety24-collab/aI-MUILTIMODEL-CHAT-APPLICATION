import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ connected: false });
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, providerId: "google" },
  });

  return Response.json({ connected: !!account });
}