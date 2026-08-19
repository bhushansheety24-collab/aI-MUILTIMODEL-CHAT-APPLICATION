"use client";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

// Parses "**To:** x\n**Subject:** y\n\nbody..." format from AI text
export function parseEmailDraft(content) {
  const toMatch = content.match(/\*\*To:\*\*\s*(.+)/i);
  const subjectMatch = content.match(/\*\*Subject:\*\*\s*(.+)/i);

  if (!toMatch || !subjectMatch) return null;

  const to = toMatch[1].trim();
  const subject = subjectMatch[1].trim();

  const subjectLineEnd = content.indexOf(subjectMatch[0]) + subjectMatch[0].length;
  let body = content.slice(subjectLineEnd).trim();

  if (!body) return null;

  return { to, subject, body };
}

const EmailSendButton = ({ to, subject, body }) => {
  const openInGmail = () => {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to,
      su: subject,
      body,
    });
    const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`;
    window.open(gmailUrl, "_blank");
  };

  return (
    <div className="mt-3">
      <Button size="sm" onClick={openInGmail}>
        <Mail className="h-3.5 w-3.5 mr-1.5" />
        Send via Gmail
      </Button>
    </div>
  );
};

export default EmailSendButton;