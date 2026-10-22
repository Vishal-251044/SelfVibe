/**
 * Upload signatures: /api/uploads/*
 */
import { createAvatarUploadSignature } from "../services/upload.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/uploads/avatar/sign — one-off Cloudinary signature for the user's avatar */
export const signAvatarUpload = (req, res) => {
  const signature = createAvatarUploadSignature(req.auth.userId);
  return sendSuccess(res, { message: "Upload signature created", data: signature });
};
