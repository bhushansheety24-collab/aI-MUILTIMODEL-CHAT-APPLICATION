"use client";
import { useState } from "react";
import { Mail, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const EmailDraftCard = ({ to, subject, body }) => {
  const [status, setStatus] = useState("draft"); // draft | sending | sent | error

  const handleSend = async () => {
    setStatus("sending");
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 my-2 max-w-md bg-muted/30">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium">
        <Mail className="h-4 w-4" />
        Email Draft
      </div>
      <div className="space-y-1 text-sm mb-3">
        <p><span className="text-muted-foreground">To:</span> {to}</p>
        <p><span className="text-muted-foreground">Subject:</span> {subject}</p>
        <div className="mt-2 p-2 rounded bg-background text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
          {body}
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleSend}
        disabled={status === "sending" || status === "sent"}
        className="w-full"
      >
        {status === "sent" ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Sent
          </>
        ) : status === "sending" ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send Email
          </>
        )}
      </Button>
      {status === "error" && (
        <p className="text-xs text-destructive mt-2">Failed to send. Try again.</p>
      )}
    </div>
  );
};

export default EmailDraftCard;