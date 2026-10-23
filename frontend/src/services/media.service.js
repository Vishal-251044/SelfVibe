/**
 * Audio and image uploads to SelfVibe storage — the Cloudinary storage pool
 * (or R2 / S3, or the API's local disk in development):
 * 1. ask the API for a signed upload (it checks type and size)
 * 2. send the file straight to that URL with progress: a signed form POST for
 *    Cloudinary, a raw PUT for S3 / local disk
 * 3. send the returned `key` with the track / artist form
 * The API never streams the bytes through its own process in production.
 */
import { api, ApiClientError } from "@/services/api";
import { AUDIO_UPLOAD, IMAGE_UPLOAD } from "@/utils/musicConstants";

const RULES = { audio: AUDIO_UPLOAD, image: IMAGE_UPLOAD };

/**
 * The content type the API should sign for a file (browsers sometimes leave
 * file.type empty or use a non-standard alias).
 * @param {File} file
 * @param {"audio"|"image"} kind
 * @returns {string|null} null when the file type is not allowed
 */
export function resolveContentType(file, kind) {
  const rules = RULES[kind];
  if (rules.mimeTypes[file.type]) return rules.mimeTypes[file.type];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return rules.extensions[extension] ?? null;
}

/**
 * Check a file against the upload rules before sending anything.
 * @param {File} file
 * @param {"audio"|"image"} kind
 * @returns {string|null} An error message, or null when the file is fine
 */
export function validateMediaFile(file, kind) {
  const rules = RULES[kind];
  if (!resolveContentType(file, kind)) {
    return kind === "audio" ? "Use an MP3, WAV, FLAC or M4A file" : "Use a JPG, PNG or WebP image";
  }
  if (file.size === 0) return "This file is empty";
  if (file.size > rules.maxBytes) {
    return `File is too large (max ${Math.round(rules.maxBytes / 1024 / 1024)} MB)`;
  }
  return null;
}

/**
 * Send a file to a signed upload target, reporting progress.
 * XMLHttpRequest is used (not fetch) because only it reports upload progress.
 * @param {File} file
 * @param {{ method: string, url: string, headers: Object, fields?: Object }} target
 * @param {Object} [options]
 * @param {(percent: number) => void} [options.onProgress] - 0–100
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<void>}
 * @throws {ApiClientError} When the upload fails or is cancelled
 */
function putFile(file, target, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    Object.entries(target.headers ?? {}).forEach(([name, value]) => {
      // Browsers set Content-Length themselves and refuse to let scripts set it
      if (name.toLowerCase() !== "content-length") xhr.setRequestHeader(name, value);
    });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = "Upload failed. Please try again.";
      if (xhr.status === 413) message = "This file is larger than allowed.";
      if (xhr.status === 403) message = "The upload link expired. Please try again.";
      reject(new ApiClientError(message, xhr.status));
    };
    xhr.onerror = () => reject(new ApiClientError("Upload failed. Check your connection.", 0));
    xhr.onabort = () => reject(new ApiClientError("Upload cancelled", 0, { code: "ABORTED" }));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    if (target.fields) {
      // Cloudinary: signed fields + the file as multipart form data
      const form = new FormData();
      Object.entries(target.fields).forEach(([name, value]) => form.append(name, String(value)));
      form.append("file", file);
      xhr.send(form);
    } else {
      xhr.send(file);
    }
  });
}

/**
 * Upload one file and return its storage key.
 * @param {File} file
 * @param {Object} options
 * @param {"audio"|"image"} options.kind
 * @param {"user"|"staff"} [options.scope="user"] - Creator uploads vs Admin Console uploads
 * @param {(percent: number) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>} The key to send with the form
 * @throws {ApiClientError}
 */
export async function uploadMedia(file, { kind, scope = "user", onProgress, signal }) {
  const problem = validateMediaFile(file, kind);
  if (problem) throw new ApiClientError(problem, 400);

  const signPath = scope === "staff" ? "/admin/uploads/sign" : "/uploads/sign";
  const signed = await api.post(
    signPath,
    {
      kind,
      contentType: resolveContentType(file, kind),
      sizeBytes: file.size,
      fileName: file.name.slice(0, 255),
    },
    { signal }
  );
  await putFile(file, signed.upload, { onProgress, signal });
  return signed.key;
}
