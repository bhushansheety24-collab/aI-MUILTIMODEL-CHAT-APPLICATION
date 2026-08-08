"use client";
import React, { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import ChatWelcomeTabs from "./chat-welcome-tabs";
import MessageView from "./messages/message-view";
import MessageForm from "./messages/message-form";
import { useChat } from "../hooks/chat";

const ChatMessageView = ({
  user = { name: "there" },
  chatId,
  initialMessages = [],
}) => {
  const [selectedMessage, setSelectedMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const { messages, isLoading, sendMessage } = useChat({
    chatId,
    initialMessages,
  });

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Track scroll position to show/hide the button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollButton(distanceFromBottom > 150);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
  };

  const handleMessageChange = () => {
    setSelectedMessage("");
  };

  const handleSend = async (message, selectedModel) => {
    setSelectedMessage("");
    await sendMessage(message, selectedModel);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full relative">
      {hasMessages ? (
        <MessageView
          messages={messages}
          isLoading={isLoading}
          bottomRef={bottomRef}
          scrollContainerRef={scrollContainerRef}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-10">
          <ChatWelcomeTabs
            userName={user?.name}
            onMessageSelect={handleMessageSelect}
          />
        </div>
      )}

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center justify-center h-9 w-9 rounded-full bg-background border border-border shadow-md hover:bg-accent transition-colors z-10"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      <MessageForm
        initialMessage={selectedMessage}
        onMessageChange={handleMessageChange}
        onSend={handleSend}
      />
    </div>
  );
};

export default ChatMessageView;