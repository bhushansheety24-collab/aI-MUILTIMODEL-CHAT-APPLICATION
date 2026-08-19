"use client";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import EmailSendButton, { parseEmailDraft } from "./email-send-button";

function MessageBubble({ role, content }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary text-primary-foreground rounded-tr-sm">
          {content}
        </div>
      </div>
    );
  }

  const emailDraft = parseEmailDraft(content);

  return (
    <div className="flex gap-3 w-full">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0 text-sm leading-relaxed text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-lg my-2 text-xs"
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code
                  className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto my-2">
                  <table className="border-collapse border border-border text-xs w-full">
                    {children}
                  </table>
                </div>
              );
            },
            th({ children }) {
              return (
                <th className="border border-border px-2 py-1 bg-black/5 dark:bg-white/5 text-left font-semibold">
                  {children}
                </th>
              );
            },
            td({ children }) {
              return (
                <td className="border border-border px-2 py-1">{children}</td>
              );
            },
            h1({ children }) {
              return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
            },
            h2({ children }) {
              return <h2 className="text-lg font-bold mt-4 mb-2">{children}</h2>;
            },
            h3({ children }) {
              return <h3 className="text-base font-bold mt-3 mb-1.5">{children}</h3>;
            },
            ul({ children }) {
              return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
            },
            p({ children }) {
              return <p className="mb-3 last:mb-0">{children}</p>;
            },
            a(props) {
              const { children, href } = props;
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>

        {emailDraft && (
          <EmailSendButton
            to={emailDraft.to}
            subject={emailDraft.subject}
            body={emailDraft.body}
          />
        )}
      </div>
    </div>
  );
}

const MessageView = ({ messages, isLoading, toolStatus, bottomRef, scrollContainerRef }) => {
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto w-full"
    >
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            {toolStatus ? (
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-muted-foreground animate-pulse">
                {toolStatus}
              </div>
            ) : (
              <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageView;