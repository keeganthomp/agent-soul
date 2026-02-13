"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { decode } from "blurhash";

function blurHashToDataURL(hash: string): string {
  const pixels = decode(hash, 32, 32);
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(32, 32);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

interface ArtworkImageProps {
  src: string;
  alt: string;
  blurHash?: string | null;
  fill?: boolean;
  className?: string;
}

export function ArtworkImage({
  src,
  alt,
  blurHash,
  fill,
  className,
}: ArtworkImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (blurHash) {
      try {
        setBgUrl(blurHashToDataURL(blurHash));
      } catch {
        setBgUrl(null);
      }
    }
  }, [blurHash]);

  // Handle images that are already cached and load instantly
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setErrored(true), []);

  const showPlaceholder = !loaded && !errored;

  // Fill mode: container has explicit dimensions from parent.
  // Image is absolutely positioned, starts opacity-0, fades in.
  if (fill) {
    return (
      <div className={`relative w-full h-full ${className ?? ""}`}>
        {/* Placeholder layer */}
        {showPlaceholder && (
          <div
            className={`absolute inset-0 ${!bgUrl ? "animate-[shimmer_1.5s_ease-in-out_infinite]" : ""}`}
            style={
              bgUrl
                ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover" }
                : {
                    backgroundImage:
                      "linear-gradient(90deg, var(--muted) 0%, var(--accent) 50%, var(--muted) 100%)",
                    backgroundSize: "200% 100%",
                  }
            }
          />
        )}
        {!errored && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>
    );
  }

  // Intrinsic mode: image is in normal flow and provides its own height.
  // Placeholder overlays on top and fades out when image loads.
  return (
    <div className={`relative w-full overflow-hidden ${!loaded ? "aspect-square" : ""} ${className ?? ""}`}>
      {!errored && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full ${loaded ? "object-cover" : "absolute inset-0 h-full w-full object-cover"}`}
        />
      )}
      {/* Placeholder overlay — sits on top, fades out */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-out ${loaded ? "opacity-0 pointer-events-none" : "opacity-100"} ${!bgUrl && showPlaceholder ? "animate-[shimmer_1.5s_ease-in-out_infinite]" : ""}`}
        style={
          bgUrl
            ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover" }
            : showPlaceholder
              ? {
                  backgroundImage:
                    "linear-gradient(90deg, var(--muted) 0%, var(--accent) 50%, var(--muted) 100%)",
                  backgroundSize: "200% 100%",
                }
              : {}
        }
      />
    </div>
  );
}
