import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { extractText, chunkText } from "@/lib/document-processing";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(req) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const chatId = formData.get("chatId");

    if (!file || !chatId) {
      return Response.json(
        { error: "File and chatId are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create Document record
    const document = await db.document.create({
      data: {
        chatId,
        fileName: file.name,
        fileType: file.type,
        status: "processing",
      },
    });

    // Extract text
    const text = await extractText(buffer, file.type);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await db.document.update({
        where: { id: document.id },
        data: { status: "failed" },
      });
      return Response.json(
        { error: "Could not extract any text from this file" },
        { status: 400 }
      );
    }

    // Generate embeddings and store each chunk (raw SQL needed for vector type)
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      const vectorString = `[${embedding.join(",")}]`;

      await db.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
        document.id,
        chunks[i],
        i,
        vectorString
      );
    }

    await db.document.update({
      where: { id: document.id },
      data: { status: "ready" },
    });

    return Response.json({ document, chunkCount: chunks.length });
  } catch (error) {
    console.error("Document upload error:", error);
    return Response.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}