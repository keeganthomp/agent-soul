import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string): Promise<string> {
  const output = await replicate.run("black-forest-labs/flux-schnell", {
    input: {
      prompt,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 90,
    },
  });

  // The SDK may return a string[], a FileOutput[], or an object with an output field
  let urls: unknown[];
  if (Array.isArray(output)) {
    urls = output;
  } else if (output && typeof output === "object" && "output" in output && Array.isArray((output as Record<string, unknown>).output)) {
    urls = (output as Record<string, unknown>).output as unknown[];
  } else {
    throw new Error(`Unexpected Replicate output shape: ${JSON.stringify(output)}`);
  }

  if (urls.length === 0) {
    throw new Error("No image generated from Replicate");
  }

  // Each item may be a string URL or a FileOutput object with a .url() method
  const first = urls[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    return String((first as { url: () => string }).url());
  }
  if (first && typeof first === "object" && "href" in first) {
    return String((first as { href: string }).href);
  }
  return String(first);
}

export async function generateImageAsync(
  prompt: string,
  webhookUrl: string,
  metadata: Record<string, string>
): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-schnell",
    input: {
      prompt,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 90,
    },
    webhook: webhookUrl,
    webhook_events_filter: ["completed"],
  });

  return prediction.id;
}

export { replicate };
