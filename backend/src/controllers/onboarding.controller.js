/**
 * Taste quiz options: /api/onboarding/*
 */
import { getOnboardingOptions } from "../services/onboarding.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/onboarding/options — genres, vibes and artists to choose from */
export const getOptions = asyncHandler(async (req, res) => {
  const options = await getOnboardingOptions();
  return sendSuccess(res, { message: "Onboarding options fetched", data: options });
});
