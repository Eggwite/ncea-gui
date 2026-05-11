import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDurationNs(durationNs: bigint) {
  if (durationNs < 1_000n) {
    return `${durationNs}ns`
  }

  if (durationNs < 1_000_000n) {
    const microseconds = Number(durationNs) / 1_000
    return `${microseconds.toFixed(microseconds < 10 ? 2 : 1)}us`
  }

  if (durationNs < 1_000_000_000n) {
    const milliseconds = Number(durationNs) / 1_000_000
    return `${milliseconds.toFixed(milliseconds < 10 ? 2 : milliseconds < 100 ? 1 : 0)}ms`
  }

  const seconds = Number(durationNs) / 1_000_000_000
  return `${seconds.toFixed(seconds < 10 ? 2 : seconds < 100 ? 1 : 0)}s`
}
