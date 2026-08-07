const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// Downscales/re-encodes to JPEG client-side before upload — a phone photo
// can be 4000px+ and several MB, which is both slow to upload and needlessly
// expensive in vision tokens for something the model just needs to read text
// off of.
export async function compressImageToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法處理圖片");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { base64, mediaType: "image/jpeg" };
}
