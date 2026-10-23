/**
 * Upload many audio files to storage (Admin Console bulk upload, PRD MUS-2):
 * a few at a time, each with its own progress, error and retry.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadMedia, validateMediaFile } from "@/services/media.service";
import { BULK_UPLOAD_MAX_FILES } from "@/utils/musicConstants";

const CONCURRENCY = 3;
let nextId = 0;

/**
 * @returns {{
 *   items: Array<{ id: number, file: File, status: "waiting"|"uploading"|"done"|"error", progress: number, key: string|null, error: string|null }>,
 *   addFiles: (files: File[]) => string|null,
 *   retry: (id: number) => void,
 *   remove: (id: number) => void,
 *   clear: () => void,
 * }}
 */
export function useBulkFileUploads() {
  const [items, setItems] = useState([]);
  const controllers = useRef(new Map());

  const patch = useCallback((id, changes) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  // Start waiting uploads while there are free slots
  useEffect(() => {
    const running = items.filter((item) => item.status === "uploading").length;
    const waiting = items
      .filter((item) => item.status === "waiting")
      .slice(0, CONCURRENCY - running);
    waiting.forEach((item) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patch(item.id, { status: "uploading", progress: 0, error: null });
      uploadMedia(item.file, {
        kind: "audio",
        scope: "staff",
        signal: controller.signal,
        onProgress: (progress) => patch(item.id, { progress }),
      })
        .then((key) => patch(item.id, { status: "done", key, progress: 100 }))
        .catch((error) => {
          if (error?.code === "ABORTED") return;
          patch(item.id, { status: "error", error: error?.message ?? "Upload failed" });
        })
        .finally(() => controllers.current.delete(item.id));
    });
  }, [items, patch]);

  // Cancel everything on unmount
  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  /**
   * Add files to the queue (invalid ones are listed with their error).
   * @param {File[]} files
   * @returns {string|null} A message when some files were not added
   */
  const addFiles = useCallback(
    (files) => {
      const room = BULK_UPLOAD_MAX_FILES - items.length;
      const accepted = files.slice(0, Math.max(0, room));
      setItems((current) => [
        ...current,
        ...accepted.map((file) => {
          const problem = validateMediaFile(file, "audio");
          return {
            id: (nextId += 1),
            file,
            status: problem ? "error" : "waiting",
            progress: 0,
            key: null,
            error: problem,
            isInvalid: Boolean(problem),
          };
        }),
      ]);
      return files.length > accepted.length
        ? `Only ${BULK_UPLOAD_MAX_FILES} files per bulk upload — ${files.length - accepted.length} skipped.`
        : null;
    },
    [items.length]
  );

  const retry = useCallback(
    (id) => patch(id, { status: "waiting", error: null, progress: 0 }),
    [patch]
  );

  const remove = useCallback((id) => {
    controllers.current.get(id)?.abort();
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    setItems([]);
  }, []);

  return { items, addFiles, retry, remove, clear };
}
