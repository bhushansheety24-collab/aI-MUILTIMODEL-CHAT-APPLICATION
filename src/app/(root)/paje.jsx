"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ChatWelcome from "@/modules/chat/components/chat-welcome";
import ChatMessageForm from "@/modules/chat/components/chat-message-form";
import { createChat, saveMessage } from "@/modules/chat/actions";

export default function Home() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMessageSent = (content, selectedModel) => {
    startTransition(async () => {
      // Create new chat
      const chat = await createChat();

      // Save user message
      await saveMessage({
        chatId: chat.id,
        content,
        role: "user",
      });

      // Redirect to chat page
      router.push(`/chat/${chat.id}`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatWelcome onSuggestionClick={handleMessageSent} />
      </div>
      <ChatMessageForm
        onMessageSent={handleMessageSent}
        isLoading={isPending}
      />
    </div>
  );
}