/**
 * Format time duration in seconds to human-readable string
 * Examples:
 * - 30 seconds -> "30 seconds"
 * - 90 seconds -> "1 minute 30 seconds"
 * - 3660 seconds -> "1 hour 1 minute"
 * - 7320 seconds -> "2 hours 2 minutes"
 */
export function formatTimeDuration(seconds: number): string {
  if (seconds < 0) {
    return '0 seconds';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }

  // Only show seconds if less than 1 hour and there are remaining seconds
  if (hours === 0 && remainingSeconds > 0) {
    parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
  }

  // If we have hours or minutes, don't show seconds (cleaner format)
  // But if we only have seconds, show them
  if (parts.length === 0) {
    return '0 seconds';
  }

  // Join parts with spaces
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  } else {
    // 3 parts: hours, minutes, seconds (though we usually don't show seconds with hours)
    return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
  }
}

