import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/** Validates a request body/query against a Zod schema — the backend half
 * of CLAUDE.md rule 5 ("every API DTO gets a Zod schema"). Throws a 400
 * (mapped to VALIDATION_ERROR by GlobalExceptionFilter) whose message
 * lists every failing field, rather than a bare "invalid input". Usage:
 * `@Body(new ZodValidationPipe(SomeSchema)) dto: SomeType` or the same
 * with `@Query()`.
 *
 * Note: `GlobalExceptionFilter` currently reads `exception.message` as a
 * plain string for the error envelope (API.md §1's `details` array isn't
 * populated by it yet) — this pipe folds field-level issues into that one
 * message string rather than changing the filter, to avoid touching
 * shared error-handling behavior other modules may come to depend on.
 * Revisit if/when the filter is extended to surface `details` properly. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const summary = result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      throw new BadRequestException(`Validation failed — ${summary}`);
    }
    return result.data;
  }
}
