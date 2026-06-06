/** Traduce claves de error IPC de snapshots y diff. */
export function versionErrorKey(key: string | null | undefined): string {
  if (!key) {
    return "errors.error.unknown";
  }
  const known = [
    "error.snapshot.name_required",
    "error.snapshot.nothing_to_commit",
    "error.snapshot.not_found",
    "error.snapshot.restore_failed",
    "error.snapshot.reserved_prefix",
    "error.snapshot.stage_failed",
    "error.snapshot.commit_failed",
    "error.snapshot.prune_failed",
    "error.snapshot.diff_failed",
    "error.snapshot.diff_too_large",
    "error.snapshot.diff_invalid",
    "error.snapshot.file_not_in_version",
    "error.git.not_initialized",
    "error.git.init_failed",
  ] as const;
  if ((known as readonly string[]).includes(key)) {
    return `errors.${key}`;
  }
  return "errors.error.unknown";
}
