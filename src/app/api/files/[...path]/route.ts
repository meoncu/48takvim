import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME } from "@/lib/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Path parametrelerini birleştirerek dosya anahtarını (fileKey) oluştur
    const fileKey = params.path.join("/");

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    const { Body, ContentType, ContentLength } = await s3Client.send(command);

    if (!Body) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Convert S3 Body to Web Stream for NextResponse
    const stream = Body.transformToWebStream();

    return new NextResponse(stream as ReadableStream, {
      headers: {
        "Content-Type": ContentType || "application/octet-stream",
        "Content-Length": ContentLength?.toString() || "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse("Error fetching file", { status: 500 });
  }
}
