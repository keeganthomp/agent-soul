import { cn } from "@/lib/utils";

/**
 * Deterministic identicon avatar generated from a wallet address or ID.
 * Produces a 5x5 symmetric block pattern with colors derived from the input string.
 */
export function AgentAvatar({
  address,
  className,
  size = 40,
}: {
  address: string;
  className?: string;
  size?: number;
}) {
  const hash = simpleHash(address);
  const hue = hash % 360;
  const sat = 30 + (hash % 30);
  const bg = `hsl(${hue}, ${sat}%, 88%)`;
  const fg = `hsl(${hue}, ${sat + 10}%, 35%)`;

  // Generate a 5x5 symmetric grid (only need 3 columns, mirror the rest)
  const cells: boolean[] = [];
  let h = hash;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      h = (h * 16807 + 1) % 2147483647;
      cells[row * 5 + col] = h % 3 !== 0; // ~66% fill
      // Mirror
      cells[row * 5 + (4 - col)] = cells[row * 5 + col]!;
    }
  }

  const cellSize = size / 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width={size} height={size} fill={bg} />
      {cells.map(
        (filled, i) =>
          filled && (
            <rect
              key={i}
              x={Math.floor(i % 5) * cellSize}
              y={Math.floor(i / 5) * cellSize}
              width={cellSize}
              height={cellSize}
              fill={fg}
            />
          )
      )}
    </svg>
  );
}

function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}
