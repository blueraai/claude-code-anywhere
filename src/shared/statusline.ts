/**
 * Statusline detection and manipulation utilities
 *
 * Used to detect the installation state of the claude-code-anywhere
 * status indicator in the user's ~/.claude/statusline.sh file.
 */

/** Current version marker for the status block */
export const CURRENT_VERSION = 'v3';

/** Start marker for the status block */
export const START_MARKER = '# --- claude-code-anywhere status ---';

/** End marker for the status block */
export const END_MARKER = '# --- end cca status ---';

/**
 * Installation state of the status indicator
 */
export interface InstallationState {
  /** Whether the start marker is present */
  hasStartMarker: boolean;
  /** Whether the end marker is present */
  hasEndMarker: boolean;
  /** Whether both markers are present (complete block) */
  hasBlock: boolean;
  /** Detected version (null if no version marker or not installed) */
  version: string | null;
  /** Number of $CCA_STATUS references in output lines (outside the block) */
  ccaRefCount: number;
  /** Whether the file needs to be updated */
  needsUpdate: boolean;
}

/**
 * Detect the installation state of the status indicator
 */
export function detectInstallation(content: string): InstallationState {
  const hasStartMarker = content.includes(START_MARKER);
  const hasEndMarker = content.includes(END_MARKER);
  const hasBlock = hasStartMarker && hasEndMarker;

  // Extract version from start marker if present
  let version: string | null = null;
  if (hasStartMarker) {
    const versionMatch = content.match(new RegExp(`${escapeRegex(START_MARKER)}\\s+(v\\d+)`));
    if (versionMatch !== null) {
      version = versionMatch[1] ?? null;
    }
  }

  // Count $CCA_STATUS references in output lines (outside the block)
  const ccaRefCount = countCcaRefs(content);

  // Determine if update is needed
  let needsUpdate = false;

  if (!hasBlock) {
    // No block installed, needs installation
    needsUpdate = true;
  } else if (version !== CURRENT_VERSION) {
    // Old version, needs update
    needsUpdate = true;
  } else if (ccaRefCount !== 1) {
    // Wrong number of output refs (0 or >1), needs repair
    needsUpdate = true;
  }

  return {
    hasStartMarker,
    hasEndMarker,
    hasBlock,
    version,
    ccaRefCount,
    needsUpdate,
  };
}

/**
 * Extract the status block from the content (markers inclusive)
 * Returns null if block is not present
 */
export function extractBlock(content: string): string | null {
  // Match from start marker to end marker (inclusive)
  const startPattern = `${escapeRegex(START_MARKER)}.*`;
  const endPattern = escapeRegex(END_MARKER);

  const regex = new RegExp(`(${startPattern}[\\s\\S]*?${endPattern})`, 'm');

  const match = content.match(regex);
  if (match === null) {
    return null;
  }

  return match[1] ?? null;
}

/**
 * Count $CCA_STATUS references in output lines
 *
 * This counts occurrences of $CCA_STATUS that appear:
 * - Outside of assignment statements (CCA_STATUS=...)
 * - In printf, echo, or other output commands
 *
 * The goal is to count how many times $CCA_STATUS appears in
 * actual output statements, not in the block's variable assignments.
 */
export function countCcaRefs(content: string): number {
  // Split content by the block markers to analyze only outside the block
  const lines = content.split('\n');

  let insideBlock = false;
  let count = 0;

  for (const line of lines) {
    // Check if we're entering or exiting the block
    if (line.includes(START_MARKER)) {
      insideBlock = true;
      continue;
    }
    if (line.includes(END_MARKER)) {
      insideBlock = false;
      continue;
    }

    // Skip lines inside the block
    if (insideBlock) {
      continue;
    }

    // Count $CCA_STATUS references on this line
    // Match both "$CCA_STATUS" and $CCA_STATUS (without quotes before)
    // But exclude assignment statements like CCA_STATUS=...
    const trimmedLine = line.trim();

    // Skip assignment lines
    if (trimmedLine.startsWith('CCA_STATUS=')) {
      continue;
    }

    // Count all occurrences of $CCA_STATUS on this line
    const matches = line.match(/\$CCA_STATUS/g);
    if (matches !== null) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
