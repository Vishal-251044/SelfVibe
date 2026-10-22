/**
 * Image uploads. The file goes straight from the browser to Cloudinary using a
 * short-lived signature from our API; our server never handles the bytes.
 */
import { api, ApiClientError } from "@/services/api";

/**
 * Get a one-off signature for uploading the signed-in user's avatar.
 * @returns {Promise<{ uploadUrl: string, fields: Object, maxBytes: number }>}
 */
export function getAvatarUploadSignature() {
  return api.post("/uploads/avatar/sign");
}

/**
 * Upload a file to Cloudinary with progress updates.
 * XMLHttpRequest is used (not fetch) because only it reports upload progress.
 * @param {File} file
 * @param {{ uploadUrl: string, fields: Object }} signature
 * @param {(percent: number) => void} [onProgress] - 0–100
 * @returns {Promise<{ secureUrl: string }>}
 * @throws {ApiClientError} When the upload fails
 */
export function uploadToCloudinary(file, { uploadUrl, fields }, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, String(value)));
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url) {
        resolve({ secureUrl: body.secure_url });
      } else {
        reject(
          new ApiClientError(
            body?.error?.message ?? "Upload failed. Try another photo.",
            xhr.status
          )
        );
      }
    };
    xhr.onerror = () => reject(new ApiClientError("Upload failed. Check your connection.", 0));
    xhr.send(form);
  });
}
