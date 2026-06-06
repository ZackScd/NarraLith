import { useEffect, useState } from "react";

import { invokeCommand } from "@/lib/ipc";

export interface MapImageUrlState {
  url: string | null;
  failed: boolean;
  loading: boolean;
}

/** Carga imagen del proyecto vía IPC (evita asset protocol y rutas `\\?\` en Windows). */
export async function resolveMapImageUrl(relativePath: string): Promise<string> {
  return invokeCommand<string>("read_project_image_cmd", { relativePath });
}

export function useMapImageUrl(
  _projectRoot: string,
  relativePath: string,
): MapImageUrlState {
  const trimmed = relativePath.trim();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trimmed) return;

    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setFailed(false);
      }
    });

    void (async () => {
      try {
        const src = await resolveMapImageUrl(trimmed);
        if (!cancelled) {
          setUrl(src);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  if (!trimmed) {
    return { url: null, failed: false, loading: false };
  }

  return { url, failed, loading };
}
