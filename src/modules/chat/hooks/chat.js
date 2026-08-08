"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createChat, saveMessage, updateChatTitle } from "../actions";
import { useChatStore } from "../store/chat-store";

export const useChat = ({ chatId, initialMessages = [] }) => {
  const router = useRouter();
  const { setActiveChatId } = useChatStore();
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (content, selectedModel) => {
      if (!content.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        let currentChatId = chatId;

        // Create new chat if no chatId
        if (!currentChatId) {
          const newChat = await createChat();
          currentChatId = newChat.id;
          setActiveChatId(currentChatId);
          router.push(`/chat/${currentChatId}`);
        }

        // Add user message to UI
        const userMessage = {
          id: Date.now().toString(),
          role: "user",
          content,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        // Save user message to DB
        await saveMessage({
          chatId: currentChatId,
          content,
          role: "user",
        });

        // Add empty assistant message
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Stream AI response
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: currentChatId,
            model: selectedModel,
            messages: [
              ...messages,
              userMessage,
            ].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to get AI response");
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update assistant message with streamed content
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: fullContent }
                : m
            )
          );
        }

        // Save assistant message to DB
        await saveMessage({
          chatId: currentChatId,
          content: fullContent,
          role: "assistant",
        });

        // Update chat title from first message
        if (messages.length === 0) {
          const title =
            content.length > 40
              ? content.substring(0, 40) + "..."
              : content;
          await updateChatTitle({ chatId: currentChatId, title });
        }

        // Refresh sidebar
        router.refresh();
      } catch (err) {
        setError(err.message);
        console.error("Chat error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [chatId, messages, isLoading, router, setActiveChatId]
  );

  return {
    messages,
    isLoading,
    input,
    error,
    setInput,
    sendMessage,
  };
};