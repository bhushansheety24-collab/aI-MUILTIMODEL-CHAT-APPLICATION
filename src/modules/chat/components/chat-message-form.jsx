"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "./model-selector"; // adjust path to match your file

const ChatMessageForm = ({
  chatId,
  initialMessages = [],
  onMessageSent,
  isLoading: externalLoading = false,
}) => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  const loading = isLoading || externalLoading;

  // Fetch live models from OpenRouter via your API route
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/ai/get-models");
        const data = await res.json();
        const modelList = data.models || data.data || data || [];
        setModels(modelList);
        if (modelList.length > 0) {
          setSelectedModel(modelList[0].id); // default to first model
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    };
    fetchModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const content = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      await onMessageSent?.(content, selectedModel);
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6">
      <form onSubmit={handleSubmit}>
        <div className="relative rounded-2xl border border-border shadow-sm transition-all">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            disabled={loading}
            className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t">
            {/* Live Model Selector */}
            <ModelSelector
              models={models}
              selectedModelId={selectedModel}
              onModelSelect={setSelectedModel}
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || loading}
              className="h-8 w-8 rounded-full"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};

export default ChatMessageForm;