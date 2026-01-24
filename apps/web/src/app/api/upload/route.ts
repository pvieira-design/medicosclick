import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN não configurado");
    return NextResponse.json(
      { error: "Upload não configurado. Configure BLOB_READ_WRITE_TOKEN no .env" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: "public",
    });
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Falha ao fazer upload da imagem" },
      { status: 500 }
    );
  }
}
