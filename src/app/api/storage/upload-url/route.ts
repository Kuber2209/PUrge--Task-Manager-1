import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid token format" },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: `Unauthorized: ${authError?.message || "Invalid session"}` },
        { status: 401 },
      );
    }

    // 2. Authorize Request (BITS Pilani email required)
    const email = user.email || "";
    /* if (!email.toLowerCase().endsWith("bits-pilani.ac.in")) {
      return NextResponse.json(
        { error: "Forbidden: Only BITS Pilani email addresses are allowed to upload documents" },
        { status: 403 },
      );
    } */

    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 },
      );
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      ContentType: contentType,
    });

    // Presigned URL valid for 60 seconds — enough for the browser upload
    const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 60 });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("Error generating R2 presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
