/**
 * Upload signatures: /api/uploads/*
 */
import { createAvatarUploadSignature } from "../services/upload.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signUpload } from "../services/mediaUpload.service.js";

/** POST /api/uploads/avatar/sign — one-off Cloudinary signature for the user's avatar */
export const signAvatarUpload = (req, res) => {
  const signature = createAvatarUploadSignature(req.auth.userId);
  return sendSuccess(res, { message: "Upload signature created", data: signature });
};

/** POST /api/uploads/sign — creators: signed direct-to-storage upload for audio / covers */
export const signMediaUpload = asyncHandler(async (req, res) => {
  const signed = await signUpload({ userId: req.auth.userId }, req.body);
  return sendSuccess(res, { message: "Upload signed", data: signed });
});

/** POST /api/admin/uploads/sign — staff: signed upload for the music manager */
export const signStaffUpload = asyncHandler(async (req, res) => {
  req.skipAudit?.(); // signing changes nothing; the track / artist write that uses it is audited
  const signed = await signUpload({ staffId: req.staff.userId }, req.body);
  return sendSuccess(res, { message: "Upload signed", data: signed });
});
