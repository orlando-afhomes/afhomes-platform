import type { z } from "zod";
import { ApiError } from "@/server/api/errors";
import { normalizeId } from "@/server/repositories/records";

/** Parses a request value with a Zod schema. Failures become a 422 with one message per field. */
export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
  throw new ApiError(422, "validation_failed", "Check the highlighted fields.", fields);
}

/** A path id in either UUID spelling. A malformed id is simply "not found". */
export function pathId(value: string | undefined, what: string): string {
  const id = value ? normalizeId(value) : null;
  if (!id) throw new ApiError(404, "not_found", `${what} not found.`);
  return id;
}
