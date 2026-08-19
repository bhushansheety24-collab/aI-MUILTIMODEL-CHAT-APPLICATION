"use client";
import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, Download, FileText, FileDown } from "lucide-react";
import ChatWelcomeTabs from "./chat-welcome-tabs";
import MessageView from "./messages/message-view";
import MessageForm from "./messages/message-form";
import { useChat } from "../hooks/chat";
import { exportAsMarkdown, exportAsPDF } from "@/lib/export-chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const ChatMessageView = ({
  user = { name: "there" },
  chatId,
  initialMessages = [],
  chatTitle = "Chat",
}) => {
  const [selectedMessage, setSelectedMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const { messages, isLoading, toolStatus, sendMessage } = useChat({
    chatId,
    initialMessages,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
    <div className="flex flex-col h-full relative overflow-hidden">
      {hasMessages && (
        <div className="absolute top-3 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportAsMarkdown(messages, chatTitle)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportAsPDF(messages, chatTitle)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {hasMessages ? (
        <MessageView
  messages={messages}
  isLoading={isLoading}
  toolStatus={toolStatus}
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
        chatId={chatId}
        initialMessage={selectedMessage}
        onMessageChange={handleMessageChange}
        onSend={handleSend}
      />
    </div>
  );
};

export default ChatMessageView;