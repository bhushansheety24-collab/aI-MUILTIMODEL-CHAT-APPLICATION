"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createChat, saveMessage, updateChatTitle } from "../actions";
import { useChatStore } from "../store/chat-store";

const TOOL_LABELS = {
  web_search: "🔍 Searching the web...",
  shop_search: "🛍️ Checking Amazon & Flipkart...",
  gmail_search: "📧 Checking Gmail...",
  drive_search: "📁 Checking Google Drive...",
  draft_email: "✍️ Drafting email...",
  create_document: "📄 Creating document...",
  get_email_attachment: "📎 Fetching attachment...",
};

export const useChat = ({ chatId, initialMessages = [] }) => {
  const router = useRouter();
  const { setActiveChatId } = useChatStore();
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (content, selectedModel) => {
      if (!content.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      setToolStatus(null);

      try {
        let currentChatId = chatId;

        if (!currentChatId) {
          const newChat = await createChat();
          currentChatId = newChat.id;
          setActiveChatId(currentChatId);
          router.push(`/chat/${currentChatId}`);
        }

        const userMessage = {
          id: Date.now().toString(),
          role: "user",
          content,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        await saveMessage({
          chatId: currentChatId,
          content,
          role: "user",
        });

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: currentChatId,
            model: selectedModel,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to get AI response");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        const markerRegex = /\u0002TOOL:([a-zA-Z_]+)\u0003/;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let match;
          while ((match = buffer.match(markerRegex))) {
            const toolName = match[1];
            setToolStatus(TOOL_LABELS[toolName] || `Using ${toolName}...`);
            buffer =
              buffer.slice(0, match.index) +
              buffer.slice(match.index + match[0].length);
          }

          const partialMarkerIndex = buffer.lastIndexOf("\u0002");
          let safeToFlush = buffer;
          let remainder = "";
          if (partialMarkerIndex !== -1) {
            safeToFlush = buffer.slice(0, partialMarkerIndex);
            remainder = buffer.slice(partialMarkerIndex);
          }

          if (safeToFlush) {
            fullContent += safeToFlush;
            setToolStatus(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullContent }
                  : m
              )
            );
          }

          buffer = remainder;
        }

        if (buffer && !buffer.includes("\u0002")) {
          fullContent += buffer;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: fullContent } : m
            )
          );
        }

        setToolStatus(null);

        await saveMessage({
          chatId: currentChatId,
          content: fullContent,
          role: "assistant",
        });

        if (messages.length === 0) {
          const title =
            content.length > 40 ? content.substring(0, 40) + "..." : content;
          await updateChatTitle({ chatId: currentChatId, title });
        }

        router.refresh();
      } catch (err) {
        setError(err.message);
        console.error("Chat error:", err);
      } finally {
        setIsLoading(false);
        setToolStatus(null);
      }
    },
    [chatId, messages, isLoading, router, setActiveChatId]
  );

  return {
    messages,
    isLoading,
    toolStatus,
    input,
    error,
    setInput,
    sendMessage,
  };
};