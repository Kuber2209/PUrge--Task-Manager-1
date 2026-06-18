"use client";

import { supabase } from "@/lib/supabase";

/**
 * Uploads a file to Cloudflare R2 via a server-side presigned URL.
 * The function signature is identical to the old Firebase Storage version.
 *
 * @param file The file to upload.
 * @param path The path prefix where the file should be stored (e.g., 'task-documents').
 * @returns The public CDN URL of the uploaded file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided for upload.");

  const fileName = `${path}/${Date.now()}_${file.name}`;

  // Get active session token to authenticate request server-side
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Step 1: Ask our server-side API route to generate a presigned upload URL.
  // R2 secrets never leave the server.
  const res = await fetch("/api/storage/upload-url", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ fileName, contentType: file.type }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get upload URL: ${err}`);
  }

  const { uploadUrl, publicUrl } = await res.json();

  // Step 2: Upload the file directly to R2 using the presigned URL.
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload file to R2: ${uploadRes.statusText}`);
  }

  // Step 3: Return the permanent public CDN URL.
  return publicUrl;
};
