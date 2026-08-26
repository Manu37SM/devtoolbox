import jsQR from "jsqr";

export interface QrDecodeResult {
  text: string | null;
  error: string | null;
}

export async function decodeQrCode(file: File): Promise<QrDecodeResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { text: null, error: "Could not read this file as an image." };
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { text: null, error: "Could not access a 2D canvas context in this browser." };
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return { text: null, error: "Could not read pixel data from this image." };
  }

  const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  if (!decoded) {
    return { text: null, error: null };
  }

  return { text: decoded.data, error: null };
}
