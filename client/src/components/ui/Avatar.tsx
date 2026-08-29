import { useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Avatar.
 *
 * Falls back to initials on a colour derived from the name, so two people in a
 * shared household plan are visually distinct without either uploading a photo.
 * The hue is a hash of the name — stable across sessions and devices, and never
 * random between renders.
 */

const SIZES = {
  sm: 'size-7 text-2xs',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-20 text-lg',
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

/** Deterministic hue from a name, kept in a band that reads on both themes. */
function hueFor(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return hash;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        SIZES[size],
        className,
      )}
      style={
        showImage
          ? undefined
          : {
              backgroundColor: `hsl(${hueFor(name)} 42% 92%)`,
              color: `hsl(${hueFor(name)} 55% 26%)`,
            }
      }
    >
      {showImage ? (
        <img
          src={src}
          // The name is on the adjacent label in every usage, so the image
          // itself is decorative — an empty alt avoids reading it twice.
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
