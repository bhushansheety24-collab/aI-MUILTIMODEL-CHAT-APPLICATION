import ArenaPanel from "@/modules/chat/components/arena/arena-panel";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function ArenaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  return <ArenaPanel user={session?.user} />;
}