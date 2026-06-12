import type { AuditEntry } from "@/lib/audit/types";

/** Buffer FIFO acotado para entradas de auditoría en RAM. */
export class AuditRingBuffer {
  private entries: AuditEntry[] = [];

  constructor(private maxSize: number) {}

  push(entry: AuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxSize) {
      this.entries.splice(0, this.entries.length - this.maxSize);
    }
  }

  toArray(limit?: number): AuditEntry[] {
    if (limit == null || limit >= this.entries.length) {
      return [...this.entries];
    }
    return this.entries.slice(this.entries.length - limit);
  }

  clear(): void {
    this.entries = [];
  }

  resize(maxSize: number): void {
    this.maxSize = maxSize;
    if (this.entries.length > maxSize) {
      this.entries.splice(0, this.entries.length - maxSize);
    }
  }

  get size(): number {
    return this.entries.length;
  }
}
