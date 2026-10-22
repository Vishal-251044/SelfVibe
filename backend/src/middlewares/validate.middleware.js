/**
 * Request validation with Zod. Replaces req.body with the parsed (trimmed,
 * normalised) value; validated query/params are put on req.validated because
 * Express 5 makes req.query read-only.
 */
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Turn Zod issues into { "field.path": "message" } (first message per field).
 * @param {import("zod").ZodIssue[]} issues
 * @returns {Object<string, string>}
 */
function toFieldErrors(issues) {
  const fields = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "_root";
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Validate parts of the request.
 * @param {{ body?: import("zod").ZodType, query?: import("zod").ZodType, params?: import("zod").ZodType }} schemas
 * @returns {import("express").RequestHandler}
 * @example router.post("/login", validate({ body: loginSchema }), login)
 */
export function validate(schemas) {
  return (req, res, next) => {
    const fields = {};
    req.validated = {};

    for (const part of ["body", "query", "params"]) {
      if (!schemas[part]) continue;

      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        req.validated[part] = result.data;
      } else {
        Object.assign(fields, toFieldErrors(result.error.issues));
      }
    }

    if (Object.keys(fields).length > 0) {
      return next(
        ApiError.badRequest("Please check the highlighted fields", {
          code: ERROR_CODES.VALIDATION_FAILED,
          fields,
        })
      );
    }

    if (req.validated.body) req.body = req.validated.body;
    return next();
  };
}
