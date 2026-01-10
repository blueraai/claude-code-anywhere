/**
 * Statusline detection and manipulation utilities
 *
 * Used to detect the installation state of the claude-code-anywhere
 * status indicator in the user's ~/.claude/statusline.sh file.
 */
/** Current version marker for the status block */
export declare const CURRENT_VERSION = "v3";
/** Start marker for the status block */
export declare const START_MARKER = "# --- claude-code-anywhere status ---";
/** End marker for the status block */
export declare const END_MARKER = "# --- end cca status ---";
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
export declare function detectInstallation(content: string): InstallationState;
/**
 * Extract the status block from the content (markers inclusive)
 * Returns null if block is not present
 */
export declare function extractBlock(content: string): string | null;
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
export declare function countCcaRefs(content: string): number;
//# sourceMappingURL=statusline.d.ts.map