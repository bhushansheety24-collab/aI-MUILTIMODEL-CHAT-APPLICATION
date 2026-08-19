import { db } from "@/lib/db";

export async function GET(req, { params }) {
  const { id } = await params;
  console.log("📥 Download requested for id:", id);

  const file = await db.generatedFile.findUnique({ where: { id } });

  if (!file) {
    console.log("📥 File not found for id:", id);
    return new Response("File not found", { status: 404 });
  }

  console.log("📥 Serving file:", file.fileName, "type:", file.mimeType);

  const buffer = Buffer.from(file.fileData, "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
    },
  });
}