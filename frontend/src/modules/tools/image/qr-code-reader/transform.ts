import jsQR from "jsqr";

export interface QrDecodeResult {
  text: string | null;
  error: string | null;
}

/** Decodes a QR code from an uploaded image file, entirely client-side.
 * `jsQR` needs raw RGBA pixel data (`Uint8ClampedArray`) + dimensions, so
 * this draws the image to an offscreen canvas via `createImageBitmap` to
 * get at `ImageData`. Not a pure function (touches `document`/canvas), so
 * unlike most transform.ts files this can't run in a Worker or under
 * jsdom — see transform.test.ts for what's tested instead and why. */
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
