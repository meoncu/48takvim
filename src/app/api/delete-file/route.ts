import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const { fileKey } = await request.json();

    if (!fileKey) {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Error deleting file" }, { status: 500 });
  }
}
