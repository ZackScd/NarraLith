export const CHIP_PAD_X = 8;
export const CHIP_MIN_WIDTH = 28;
export const CHIP_MAX_WIDTH = 168;
export const CHIP_TRUNC_SIMPLE = 18;
export const CHIP_TRUNC_FILE = 14;
export const CHIP_TRUNC_EVENT = 18;
export const CHAR_W_PRIMARY = 6.5;
export const CHAR_W_SECONDARY = 6;

export function truncateForChip(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function measureLineWidth(
  text: string,
  maxLen: number,
  charWidth: number,
): number {
  const visible = truncateForChip(text, maxLen);
  return Math.min(
    CHIP_MAX_WIDTH,
    Math.max(CHIP_MIN_WIDTH, Math.ceil(visible.length * charWidth) + CHIP_PAD_X),
  );
}

export type ChipWidthInput = {
  label: string;
  fileLabel: string;
  eventLabel: string | null;
};

export function estimateChipWidth(item: ChipWidthInput): number {
  if (item.eventLabel) {
    return Math.max(
      measureLineWidth(item.fileLabel, CHIP_TRUNC_FILE, CHAR_W_SECONDARY),
      measureLineWidth(item.eventLabel, CHIP_TRUNC_EVENT, CHAR_W_PRIMARY),
    );
  }
  return measureLineWidth(item.label, CHIP_TRUNC_SIMPLE, CHAR_W_PRIMARY);
}
