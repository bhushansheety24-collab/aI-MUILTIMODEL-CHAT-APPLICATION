import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, model } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required and cannot be empty" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!model) {
      return new Response(
        JSON.stringify({ error: "Model is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validMessages = messages.filter(
      (m) => m.content && m.content.trim() !== ""
    );

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages with content found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = streamText({
      model: openrouter(model),
      system: SYSTEM_PROMPT,
      messages: validMessages,
      onError: ({ error }) => {
        console.error("StreamText error name:", error?.name);
        console.error("StreamText error message:", error?.message);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process chat request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}