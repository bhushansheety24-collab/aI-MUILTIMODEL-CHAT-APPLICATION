"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp, Paperclip, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "../model-selector";

const MessageForm = ({
  chatId,
  initialMessage = "",
  onMessageChange,
  onSend,
  isLoading: externalLoading = false,
}) => {
  const [message, setMessage] = useState(initialMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [attachedFile, setAttachedFile] = useState(null); // { name, status: "uploading" | "ready" | "error" }
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const loading = isLoading || externalLoading;

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/ai/get-models");
        const data = await res.json();
        const modelList = data.models || [];
        setModels(modelList);
        if (modelList.length > 0) {
          setSelectedModel(modelList[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    };
    fetchModels();
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    setUploadError("");
    setAttachedFile({ name: file.name, status: "uploading" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatId", chatId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Stay visible as "ready" — no auto-clear
      setAttachedFile({ name: file.name, status: "ready" });
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message);
      setAttachedFile(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setUploadError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const content = message.trim();
    setMessage("");
    onMessageChange?.();
    setIsLoading(true);

    try {
      await onSend?.(content, selectedModel);
      // Clear the attachment chip once the message is actually sent
      setAttachedFile(null);
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 pb-6">
      {uploadError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          <X className="h-3.5 w-3.5" />
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError("")}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="relative rounded-2xl border border-border shadow-sm transition-all">
          {/* Attached file chip — stays until sent or removed */}
          {attachedFile && (
            <div className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg bg-muted text-sm w-fit max-w-[calc(100%-1.5rem)]">
              {attachedFile.status === "uploading" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0 text-green-500" />
              )}
              <span className="truncate">{attachedFile.name}</span>
              {attachedFile.status === "uploading" && (
                <span className="text-xs text-muted-foreground shrink-0">
                  Processing...
                </span>
              )}
              <button
                type="button"
                onClick={removeAttachedFile}
                className="ml-1 shrink-0 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

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
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                disabled={!chatId || attachedFile?.status === "uploading"}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <ModelSelector
                models={models}
                selectedModelId={selectedModel}
                onModelSelect={setSelectedModel}
              />
            </div>

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

export default MessageForm;