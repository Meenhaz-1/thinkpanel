export type ValidationApiError = {
  error: string;
  code: string;
  field: string;
};

type UnknownApiErrorPayload = Partial<Record<keyof ValidationApiError, unknown>>;

export function isValidationApiError(
  value: unknown,
): value is ValidationApiError {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as UnknownApiErrorPayload;
  return (
    typeof candidate.error === "string" &&
    typeof candidate.code === "string" &&
    typeof candidate.field === "string"
  );
}

