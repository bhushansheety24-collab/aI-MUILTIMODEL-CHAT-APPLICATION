"use client";
import { useState, useEffect } from "react";
import { Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function stripToolMarkers(text) {
  return text.replace(/\u0002TOOL:[a-zA-Z_]+\u0003/g, "");
}

async function streamOneModel(question, model, onChunk) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = stripToolMarkers(decoder.decode(value, { stream: true }));
    full += chunk;
    onChunk(full);
  }

  return full;
}

const ArenaPanel = ({ user }) => {
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState({});
  const [loadingModels, setLoadingModels] = useState({});

  useEffect(() => {
    fetch("/api/ai/get-models")
      .then((res) => res.json())
      .then((data) => setModels(data.models || []));
  }, []);

  const toggleModel = (id) => {
    setSelectedModels((prev) =>
      prev.includes(id)
        ? prev.filter((m) => m !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const handleCompare = async () => {
    if (!question.trim() || selectedModels.length === 0) return;

    const newResults = {};
    const newLoading = {};
    selectedModels.forEach((m) => {
      newResults[m] = "";
      newLoading[m] = true;
    });
    setResults(newResults);
    setLoadingModels(newLoading);

    await Promise.allSettled(
      selectedModels.map(async (model) => {
        try {
          await streamOneModel(question, model, (partial) => {
            setResults((prev) => ({ ...prev, [model]: partial }));
          });
        } catch (err) {
          setResults((prev) => ({
            ...prev,
            [model]: `Error: ${err.message}`,
          }));
        } finally {
          setLoadingModels((prev) => ({ ...prev, [model]: false }));
        }
      })
    );
  };

  const getModelName = (id) => models.find((m) => m.id === id)?.name || id;

  return (
    <div className="flex flex-col h-full p-6 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">Arena Mode</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Compare up to 3 models side by side on the same question.
      </p>

      <div className="mb-4">
        <p className="text-sm font-medium mb-2">
          Select models ({selectedModels.length}/3)
        </p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedModels.includes(m.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question to compare across models..."
          className="min-h-[60px]"
        />
        <Button
          onClick={handleCompare}
          disabled={!question.trim() || selectedModels.length === 0}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div
        className={`flex-1 grid gap-4 overflow-hidden ${
          selectedModels.length === 1
            ? "grid-cols-1"
            : selectedModels.length === 2
            ? "grid-cols-2"
            : "grid-cols-3"
        }`}
      >
        {selectedModels.map((modelId) => (
          <div
            key={modelId}
            className="flex flex-col border border-border rounded-xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
              <span className="text-xs font-semibold truncate">
                {getModelName(modelId)}
              </span>
              {loadingModels[modelId] && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 text-xs">
              {results[modelId] ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {results[modelId]}
                </ReactMarkdown>
              ) : (
                <span className="text-muted-foreground">
                  {loadingModels[modelId] ? "Thinking..." : "No response yet"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArenaPanel;