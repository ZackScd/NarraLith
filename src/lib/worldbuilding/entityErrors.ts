const ENTITY_ERROR_PREFIX = "error.entity.";
const TEMPLATE_ERROR_PREFIX = "error.template.";
const FOLDER_ERROR_PREFIX = "error.folder.";
const FS_ERROR_PREFIX = "error.fs.";

export function normalizeEntityErrorKey(key: string): string {
  if (key.startsWith(FOLDER_ERROR_PREFIX)) {
    const suffix = key.slice(FOLDER_ERROR_PREFIX.length);
    return `errors.folder.${suffix}`;
  }
  if (key.startsWith(ENTITY_ERROR_PREFIX) || key.startsWith(TEMPLATE_ERROR_PREFIX)) {
    const suffix = key.split(".").slice(2).join(".");
    return `errors.${suffix}`;
  }
  if (key.startsWith(FS_ERROR_PREFIX)) {
    const suffix = key.split(".").slice(2).join(".");
    const mapped: Record<string, string> = {
      path_exists: "errors.path_exists",
      invalid_name: "errors.invalid_name",
      invalid_path: "errors.invalid_path",
    };
    return mapped[suffix] ?? key;
  }
  return key;
}
