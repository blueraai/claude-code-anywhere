import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  detectInstallation,
  extractBlock,
  countCcaRefs,
  CURRENT_VERSION,
  type InstallationState,
} from '../src/shared/statusline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures', 'statusline');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('statusline detection', () => {
  describe('detectInstallation', () => {
    it('detects no installation in fresh file', () => {
      const content = loadFixture('fresh.sh');
      const state = detectInstallation(content);

      expect(state.hasStartMarker).toBe(false);
      expect(state.hasEndMarker).toBe(false);
      expect(state.hasBlock).toBe(false);
      expect(state.version).toBeNull();
      expect(state.ccaRefCount).toBe(0);
      expect(state.needsUpdate).toBe(true);
    });

    it('detects current version installation', () => {
      const content = loadFixture('installed-current.sh');
      const state = detectInstallation(content);

      expect(state.hasStartMarker).toBe(true);
      expect(state.hasEndMarker).toBe(true);
      expect(state.hasBlock).toBe(true);
      expect(state.version).toBe(CURRENT_VERSION);
      expect(state.ccaRefCount).toBe(1);
      expect(state.needsUpdate).toBe(false);
    });

    it('detects outdated version installation', () => {
      const content = loadFixture('installed-old.sh');
      const state = detectInstallation(content);

      expect(state.hasStartMarker).toBe(true);
      expect(state.hasEndMarker).toBe(true);
      expect(state.hasBlock).toBe(true);
      expect(state.version).toBeNull(); // No version marker in old format
      expect(state.needsUpdate).toBe(true);
    });

    it('detects partial block installation (block but no output ref)', () => {
      const content = loadFixture('partial-block.sh');
      const state = detectInstallation(content);

      expect(state.hasBlock).toBe(true);
      expect(state.version).toBe(CURRENT_VERSION);
      expect(state.ccaRefCount).toBe(0);
      expect(state.needsUpdate).toBe(true); // Needs output ref added
    });

    it('detects partial output installation (output ref but no block)', () => {
      const content = loadFixture('partial-output.sh');
      const state = detectInstallation(content);

      expect(state.hasBlock).toBe(false);
      expect(state.ccaRefCount).toBe(1);
      expect(state.needsUpdate).toBe(true); // Needs block added
    });

    it('detects duplicate $CCA_STATUS references', () => {
      const content = loadFixture('duplicate-outputs.sh');
      const state = detectInstallation(content);

      expect(state.hasBlock).toBe(true);
      expect(state.ccaRefCount).toBe(2);
      expect(state.needsUpdate).toBe(true); // Needs duplicate removed
    });

    it('handles complex conditionals file', () => {
      const content = loadFixture('conditionals.sh');
      const state = detectInstallation(content);

      expect(state.hasBlock).toBe(false);
      expect(state.ccaRefCount).toBe(0);
      expect(state.needsUpdate).toBe(true);
    });
  });

  describe('extractBlock', () => {
    it('returns null for file without block', () => {
      const content = loadFixture('fresh.sh');
      const block = extractBlock(content);

      expect(block).toBeNull();
    });

    it('extracts block from installed file', () => {
      const content = loadFixture('installed-current.sh');
      const block = extractBlock(content);

      expect(block).not.toBeNull();
      expect(block).toContain('CCA_STATUS=""');
      expect(block).toContain('_CCA_PORT=');
      expect(block).toContain('_SESSION_ID=');
    });

    it('extracts old format block', () => {
      const content = loadFixture('installed-old.sh');
      const block = extractBlock(content);

      expect(block).not.toBeNull();
      expect(block).toContain('CCA_STATUS=""');
      expect(block).toContain('_CCA_PORT=');
      // Old format doesn't have _SESSION_ID
      expect(block).not.toContain('_SESSION_ID=');
    });
  });

  describe('countCcaRefs', () => {
    it('counts zero refs in fresh file', () => {
      const content = loadFixture('fresh.sh');
      const count = countCcaRefs(content);

      expect(count).toBe(0);
    });

    it('counts one ref in properly installed file', () => {
      const content = loadFixture('installed-current.sh');
      const count = countCcaRefs(content);

      expect(count).toBe(1);
    });

    it('counts duplicate refs', () => {
      const content = loadFixture('duplicate-outputs.sh');
      const count = countCcaRefs(content);

      expect(count).toBe(2);
    });

    it('does not count refs inside the block definition', () => {
      // The block has CCA_STATUS= assignments, but these shouldn't count
      // Only output lines with $CCA_STATUS should count
      const content = loadFixture('installed-current.sh');
      const count = countCcaRefs(content);

      // Should only count the output line, not the assignments in the block
      expect(count).toBe(1);
    });
  });
});
