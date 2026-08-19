import ChatMessageView from "@/modules/chat/components/chat-message-view";
import { getChat } from "@/modules/chat/actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const ChatPage = async ({ params }) => {
  const { chatId } = await params;
  const chat = await getChat(chatId);

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session.user;

  return (
    <ChatMessageView
      user={user}
      chatId={chat.id}
      initialMessages={chat.messages}
      chatTitle={chat.title}
    />
  );
};

export default ChatPage;