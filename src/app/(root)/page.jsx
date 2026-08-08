import ChatMessageView from "@/modules/chat/components/chat-message-view";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const HomePage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session.user;

  return (
    <div className="flex flex-col h-full">
      <ChatMessageView user={user} />
    </div>
  );
};

export default HomePage;