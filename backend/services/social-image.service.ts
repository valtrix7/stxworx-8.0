import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "social-posts");
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    throw new Error("Unsupported image format");
  }

  const mimeType = match[1];
  const base64Payload = match[2];
  const buffer = Buffer.from(base64Payload, "base64");

  if (!buffer.length) {
    throw new Error("Image payload is empty");
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image is too large");
  }

  return {
    buffer,
    extension: MIME_EXTENSION_MAP[mimeType],
  };
}

export async function saveSocialPostImage(dataUrl: string) {
  const { buffer, extension } = parseImageDataUrl(dataUrl);

  await mkdir(UPLOAD_ROOT, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = path.join(UPLOAD_ROOT, fileName);

  await writeFile(filePath, buffer);

  return `/uploads/social-posts/${fileName}`;
}
