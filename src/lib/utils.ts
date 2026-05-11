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

export function formatRelativeTime(timestamp: number | undefined | null) {
  if (!timestamp) return "Unknown"
  const now = Date.now()
  const diff = Math.max(0, now - timestamp)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec} second${sec !== 1 ? 's' : ''} ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}
