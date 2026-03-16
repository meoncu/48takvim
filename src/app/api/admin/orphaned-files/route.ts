import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME } from "@/lib/s3";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    // 1. Get all files from R2
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
    });
    const r2Response = await s3Client.send(listCommand);
    const r2Files = r2Response.Contents || [];

    // 2. Get all referenced attachment URLs from Firestore
    // Note: This uses collectionGroup which might require an index in some cases,
    // but for listing everything it usually works.
    const notesSnapshot = await getDocs(collectionGroup(db, "notes"));
    const referencedKeys = new Set<string>();

    notesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.attachments && Array.isArray(data.attachments)) {
        data.attachments.forEach((att: any) => {
          if (att.url) {
            // Extract key from URL
            // Case 1: /api/files/key
            // Case 2: https://...r2.dev/key
            const urlParts = att.url.split("/api/files/");
            let key = urlParts.length > 1 ? urlParts[1] : null;
            
            if (!key) {
              const r2Parts = att.url.split(".r2.dev/");
              key = r2Parts.length > 1 ? r2Parts[1] : att.url.split("/").pop();
            }

            if (key) {
              referencedKeys.add(decodeURIComponent(key));
            }
          }
        });
      }
    });

    // 3. Compare and find orphans
    const orphanedFiles = r2Files
      .filter((file) => file.Key && !referencedKeys.has(file.Key))
      .map((file) => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        url: `/api/files/${file.Key}`,
      }));

    return NextResponse.json({
      orphanedFiles,
      totalCount: r2Files.length,
      referencedCount: referencedKeys.size,
      orphanedCount: orphanedFiles.length,
    });
  } catch (error) {
    console.error("Orphan search error:", error);
    return NextResponse.json({ error: "Error searching orphaned files" }, { status: 500 });
  }
}
