import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";
import { searchWeb } from "@/lib/web-search";
import { searchGmail, searchDrive, getGmailAttachment } from "@/lib/google-connector";
import { generateDocx } from "@/lib/generate-docx";
import { comparePrices } from "@/lib/shopping-search";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function getRelevantContext(chatId, question) {
  const latestDocument = await db.document.findFirst({
    where: { chatId, status: "ready" },
    orderBy: { createdAt: "desc" },
  });

  if (!latestDocument) return null;

  const totalChunks = await db.documentChunk.count({
    where: { documentId: latestDocument.id },
  });

  if (totalChunks <= 20) {
    const allChunks = await db.documentChunk.findMany({
      where: { documentId: latestDocument.id },
      orderBy: { chunkIndex: "asc" },
    });

    return allChunks.map((c) => ({
      content: c.content,
      fileName: latestDocument.fileName,
    }));
  }

  const questionEmbedding = await generateEmbedding(question);
  const vectorString = `[${questionEmbedding.join(",")}]`;

  const results = await db.$queryRawUnsafe(
    `SELECT dc.content, dc."chunkIndex", d."fileName",
            1 - (dc.embedding <=> $1::vector) as similarity
     FROM "DocumentChunk" dc
     JOIN "Document" d ON dc."documentId" = d.id
     WHERE d.id = $2
     ORDER BY dc.embedding <=> $1::vector
     LIMIT 10`,
    vectorString,
    latestDocument.id
  );

  return results;
}

export async function POST(req) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, model, chatId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required and cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!model) {
      return new Response(JSON.stringify({ error: "Model is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validMessages = messages.filter(
      (m) => m.content && m.content.trim() !== ""
    );

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages with content found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastMessage = validMessages[validMessages.length - 1];
    let systemPrompt = SYSTEM_PROMPT;

    if (chatId && lastMessage.role === "user") {
      try {
        const context = await getRelevantContext(chatId, lastMessage.content);
        if (context && context.length > 0) {
          const contextText = context
            .map((c, i) => `[Source ${i + 1}: ${c.fileName}]\n${c.content}`)
            .join("\n\n");

          systemPrompt = `${SYSTEM_PROMPT}

You have access to the following document excerpts that may be relevant to the user's question. Use them to answer accurately, and cite which source (e.g. "Source 1") you used when referencing specific information. If the excerpts don't contain relevant information, answer from your general knowledge instead and don't force a citation.

${contextText}`;
        }
      } catch (err) {
        console.error("Retrieval error (continuing without context):", err);
      }
    }

    systemPrompt += `

You have access to these tools:
- web_search: use for current events, recent news, prices, or general up-to-date information.
- draft_email: use when the user asks you to write, compose, or draft an email. This does not send the email — it only prepares a draft for the user to review.
- gmail_search: use when the user asks about their emails. Returns messageId, and for each email, a list of attachments (each with attachmentId, filename, mimeType) if present. Requires the user to have connected Google at /settings.
- get_email_attachment: use when the user asks to open/download a specific attachment mentioned in a previous gmail_search result. You must use the exact messageId, attachmentId, filename, and mimeType from that earlier result.
- drive_search: use when the user asks about their Drive files/documents. Requires the user to have connected Google at /settings.
- create_document: use when the user asks you to write, create, or generate a downloadable document, report, or file based on some topic or content.
- shop_search: use when the user wants to buy something or compare prices. Returns real results with prices, ratings, and a "link" field for each product. For EVERY product you mention, you MUST wrap the product name in a markdown link using its exact "link" value, formatted like this: [Product Name](link) - ₹price (MRP ₹mrp) - rating★. Do not list any product without making its name a clickable link. Never make up or omit a link — if a product has no link, don't include it.

When you use web_search results, include the actual source links as clickable markdown links at the end of your response under a "**Sources:**" heading. Never make up a URL.

When you use draft_email, present the draft clearly to the user with To, Subject, and Body labeled, and remind them you can't send it directly — they'll need to copy it into their own email client.

When you use create_document or get_email_attachment, respond with ONLY a short confirmation sentence followed by a markdown link in this EXACT format on its own line: [filename.ext](downloadUrl). Do NOT write the URL as plain text anywhere. Do NOT put the filename in bold separately from the link. The ENTIRE filename and link must be wrapped together as one markdown link — never write the raw URL or filename outside of this bracket-parenthesis format. Use the literal downloadUrl and fileName values returned by the tool.

If gmail_search or drive_search fails because the account isn't connected, tell the user to go to /settings to connect their Google account.`;

    const result = streamText({
      model: openrouter(model),
      system: systemPrompt,
      messages: validMessages,
      stopWhen: stepCountIs(5),
      tools: {
        web_search: tool({
          description:
            "Search the web for current information, news, or facts that may not be in your training data.",
          inputSchema: z.object({
            query: z.string().describe("The search query"),
          }),
          execute: async ({ query }) => {
            try {
              const results = await searchWeb(query);
              return { results };
            } catch (err) {
              return { error: "Web search failed", details: err.message };
            }
          },
        }),
        draft_email: tool({
          description:
            "Draft an email when the user asks you to write, compose, or send an email. This creates a draft for the user to review and send — it does not send automatically.",
          inputSchema: z.object({
            to: z.string().describe("Recipient email address"),
            subject: z.string().describe("Email subject line"),
            body: z.string().describe("The full email body text"),
          }),
          execute: async ({ to, subject, body }) => {
            return { draft: { to, subject, body }, status: "ready_for_review" };
          },
        }),
        gmail_search: tool({
          description:
            "Search the user's Gmail inbox when they ask about emails they've received or sent. Returns attachments info if present. Requires the user to have connected their Google account.",
          inputSchema: z.object({
            query: z.string().describe("Gmail search query, e.g. 'from:boss subject:meeting'"),
          }),
          execute: async ({ query }) => {
            try {
              const results = await searchGmail(query);
              return { results };
            } catch (err) {
              return {
                error: "Gmail search failed. The user may need to connect their Google account at /settings.",
                details: err.message,
              };
            }
          },
        }),
        get_email_attachment: tool({
          description:
            "Download an attachment from a specific email. Use this after gmail_search has found an email with an attachment the user wants to open. You need the messageId, attachmentId, and filename from the gmail_search results.",
          inputSchema: z.object({
            messageId: z.string().describe("The Gmail message ID from a previous gmail_search result"),
            attachmentId: z.string().describe("The attachment ID from a previous gmail_search result"),
            filename: z.string().describe("The original filename of the attachment"),
            mimeType: z.string().describe("The MIME type of the attachment"),
          }),
          execute: async ({ messageId, attachmentId, filename, mimeType }) => {
            try {
              const base64 = await getGmailAttachment(messageId, attachmentId);

              const generated = await db.generatedFile.create({
                data: { fileName: filename, fileData: base64, mimeType },
              });

              return {
                success: true,
                downloadUrl: `/api/documents/download/${generated.id}`,
                fileName: filename,
              };
            } catch (err) {
              return { error: "Failed to get attachment", details: err.message };
            }
          },
        }),
        drive_search: tool({
          description:
            "Search the user's Google Drive files when they ask about documents, spreadsheets, or files they've saved. Requires the user to have connected their Google account.",
          inputSchema: z.object({
            query: z.string().describe("File name or keywords to search for"),
          }),
          execute: async ({ query }) => {
            try {
              const results = await searchDrive(query);
              return { results };
            } catch (err) {
              return {
                error: "Drive search failed. The user may need to connect their Google account at /settings.",
                details: err.message,
              };
            }
          },
        }),
        create_document: tool({
          description:
            "Create a downloadable Word document (.docx) when the user asks you to write, create, or generate a document, report, or file based on some content or topic.",
          inputSchema: z.object({
            title: z.string().describe("The title of the document"),
            content: z
              .string()
              .describe(
                "The full content of the document, written in clear paragraphs. Use '# Heading' for main headings and '## Subheading' for subheadings."
              ),
          }),
          execute: async ({ title, content }) => {
            try {
              const buffer = await generateDocx(title, content);
              const base64 = buffer.toString("base64");

              const generated = await db.generatedFile.create({
                data: {
                  fileName: `${title.replace(/[^a-z0-9]/gi, "_")}.docx`,
                  fileData: base64,
                  mimeType:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                },
              });

              return {
                success: true,
                downloadUrl: `/api/documents/download/${generated.id}`,
                fileName: generated.fileName,
              };
            } catch (err) {
              return { error: "Failed to create document", details: err.message };
            }
          },
        }),
        shop_search: tool({
          description:
            "Search for products to buy and compare real prices across Amazon and Flipkart when the user wants to buy something, e.g. shoes, phones, electronics.",
          inputSchema: z.object({
            query: z.string().describe("What product to search for, e.g. 'running shoes'"),
          }),
          execute: async ({ query }) => {
            try {
              const results = await comparePrices(query);
              return { results };
            } catch (err) {
              return { error: "Shopping search failed", details: err.message };
            }
          },
        }),
      },
      onError: ({ error }) => {
        console.error("StreamText error name:", error?.name);
        console.error("StreamText error message:", error?.message);
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === "tool-call") {
              controller.enqueue(
                encoder.encode(`\u0002TOOL:${part.toolName}\u0003`)
              );
            } else if (part.type === "text-delta") {
              const text = part.text ?? part.textDelta ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}