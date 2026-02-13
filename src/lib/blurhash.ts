import { encode } from "blurhash";
import sharp from "sharp";

export async function generateBlurHash(
  imageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .resize(32, 32)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
  } catch {
    return null;
  }
}
