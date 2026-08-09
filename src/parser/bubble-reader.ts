import { readFileSync, statSync } from 'fs';
import { extname, resolve } from 'path';
import type { BubbleApp } from './schema.js';

export class BubbleReadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
  ) {
    super(message);
    this.name = 'BubbleReadError';
  }
}

/**
 * Reads a .bubble (or .json) file and returns a parsed BubbleApp object.
 * Throws BubbleReadError if the file is missing, unreadable, or invalid.
 */
export function readBubbleFile(filePath: string): BubbleApp {
  const resolved = resolve(filePath);
  const ext = extname(resolved).toLowerCase();

  if (ext !== '.bubble' && ext !== '.json') {
    throw new BubbleReadError(
      `Expected a .bubble or .json file, got: ${ext}`,
      resolved,
    );
  }

  let raw: string;
  try {
    raw = readFileSync(resolved, 'utf-8');
  } catch {
    throw new BubbleReadError(`Cannot read file: ${resolved}`, resolved);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new BubbleReadError(
      `File is not valid JSON: ${(err as Error).message}`,
      resolved,
    );
  }

  validateBubbleApp(json, resolved);
  return json as BubbleApp;
}

function validateBubbleApp(json: unknown, filePath: string): void {
  if (!json || typeof json !== 'object') {
    throw new BubbleReadError('File is not a JSON object', filePath);
  }

  const obj = json as Record<string, unknown>;

  if (obj['type'] !== 'application') {
    throw new BubbleReadError(
      `Not a Bubble app export (expected type: "application", got: "${obj['type']}")`,
      filePath,
    );
  }

  if (!obj['pages'] || typeof obj['pages'] !== 'object') {
    throw new BubbleReadError('Missing or invalid "pages" section', filePath);
  }

  if (!obj['user_types'] || typeof obj['user_types'] !== 'object') {
    throw new BubbleReadError(
      'Missing or invalid "user_types" section',
      filePath,
    );
  }
}

/**
 * Returns file size info for display purposes
 */
export function getBubbleFileStats(filePath: string): {
  sizeBytes: number;
  sizeMb: string;
} {
  try {
    const stats = statSync(resolve(filePath));
    const sizeBytes = stats.size;
    return {
      sizeBytes,
      sizeMb: (sizeBytes / 1024 / 1024).toFixed(2),
    };
  } catch {
    return { sizeBytes: 0, sizeMb: '0.00' };
  }
}
