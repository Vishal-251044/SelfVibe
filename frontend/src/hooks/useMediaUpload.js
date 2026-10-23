/**
 * State for one file upload: pick a file → upload with progress → storage key.
 * Starting a new file cancels the previous upload. Used by the creator upload
 * form and the Admin Console forms.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadMedia, validateMediaFile } from "@/services/media.service";

/**
 * @param {Object} options
 * @param {"audio"|"image"} options.kind
 * @param {"user"|"staff"} [options.scope="user"]
 * @returns {{
 *   file: File|null, key: string|null, progress: number,
 *   status: "idle"|"uploading"|"done"|"error", error: string|null,
 *   previewUrl: string|null, start: (file: File) => Promise<void>, reset: () => void
 * }}
 */
export function useMediaUpload({ kind, scope = "user" }) {
  const [state, setState] = useState({
    file: null,
    key: null,
    progress: 0,
    status: "idle",
    error: null,
    previewUrl: null,
  });
  const controllerRef = useRef(null);

  // Free the image preview URL when it changes or on unmount
  useEffect(() => {
    const url = state.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.previewUrl]);

  // Cancel an in-flight upload when the component unmounts
  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = useCallback(
    async (file) => {
      controllerRef.current?.abort();
      const problem = validateMediaFile(file, kind);
      const previewUrl = kind === "image" && !problem ? URL.createObjectURL(file) : null;
      if (problem) {
        setState({
          file,
          key: null,
          progress: 0,
          status: "error",
          error: problem,
          previewUrl: null,
        });
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ file, key: null, progress: 0, status: "uploading", error: null, previewUrl });
      try {
        const key = await uploadMedia(file, {
          kind,
          scope,
          signal: controller.signal,
          onProgress: (progress) =>
            setState((current) => (current.file === file ? { ...current, progress } : current)),
        });
        setState((current) =>
          current.file === file ? { ...current, key, progress: 100, status: "done" } : current
        );
      } catch (error) {
        if (error?.code === "ABORTED" || error?.name === "AbortError") return;
        setState((current) =>
          current.file === file
            ? { ...current, status: "error", error: error?.message ?? "Upload failed" }
            : current
        );
      }
    },
    [kind, scope]
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ file: null, key: null, progress: 0, status: "idle", error: null, previewUrl: null });
  }, []);

  return { ...state, start, reset };
}
