/**
 * Taste quiz options: /api/onboarding/*
 */
import * as onboardingService from "../services/onboarding.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/onboarding/options — genres, vibes and artists to choose from */
export const getOptions = asyncHandler(async (req, res) => {
  const options = await onboardingService.getOnboardingOptions();
  return sendSuccess(res, { message: "Onboarding options fetched", data: options });
});

/** GET /api/onboarding/artists?genres=a,b&vibes=c — artists matching the picks, India first */
export const getArtistSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await onboardingService.getArtistSuggestions(req.validated.query);
  return sendSuccess(res, { message: "Artist suggestions fetched", data: suggestions });
});
