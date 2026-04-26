export const EVALUATION_PERSONA_COUNT = 3;
export const MAX_EVALUATION_IMAGES = 2;
export const MAX_EVALUATION_IMAGE_BYTES = 1024 * 1024;
export const EVALUATION_IMAGE_DETAIL = "low" as const;

export const SUPPORTED_EVALUATION_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const EVALUATION_IMAGE_ACCEPT =
  SUPPORTED_EVALUATION_IMAGE_TYPES.join(",");

export type EvaluationImageMimeType =
  (typeof SUPPORTED_EVALUATION_IMAGE_TYPES)[number];

export type EvaluationImageInput = {
  dataUrl: string;
  mimeType: EvaluationImageMimeType;
  name: string;
  sizeBytes: number;
};

type EvaluationImageFileLike = {
  name?: string;
  size: number;
  type: string;
};

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    const value = bytes / (1024 * 1024);
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

export function isSupportedEvaluationImageType(
  value: string,
): value is EvaluationImageMimeType {
  return SUPPORTED_EVALUATION_IMAGE_TYPES.includes(
    value.toLowerCase() as EvaluationImageMimeType,
  );
}

export function getEvaluationImageValidationError(
  files: EvaluationImageFileLike[],
) {
  if (files.length > MAX_EVALUATION_IMAGES) {
    return `Upload up to ${MAX_EVALUATION_IMAGES} images at a time.`;
  }

  const emptyFile = files.find((file) => file.size <= 0);
  if (emptyFile) {
    return `${emptyFile.name || "One image"} appears to be empty.`;
  }

  const unsupportedFile = files.find(
    (file) => !isSupportedEvaluationImageType(file.type),
  );
  if (unsupportedFile) {
    return "Images must be PNG, JPG, or WebP files.";
  }

  const oversizedFile = files.find(
    (file) => file.size > MAX_EVALUATION_IMAGE_BYTES,
  );
  if (oversizedFile) {
    return `Each image must be ${formatBytes(MAX_EVALUATION_IMAGE_BYTES)} or smaller.`;
  }

  return null;
}

export function sanitizeEvaluationImageName(name: string) {
  const cleaned = name
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 80) || "image";
}

function isEvaluationImageInput(value: unknown): value is EvaluationImageInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EvaluationImageInput>;
  if (
    typeof candidate.dataUrl !== "string" ||
    typeof candidate.mimeType !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.sizeBytes !== "number"
  ) {
    return false;
  }

  if (
    !isSupportedEvaluationImageType(candidate.mimeType) ||
    candidate.sizeBytes <= 0 ||
    candidate.sizeBytes > MAX_EVALUATION_IMAGE_BYTES
  ) {
    return false;
  }

  const dataUrlPrefix = `data:${candidate.mimeType};base64,`;
  const maxDataUrlLength =
    dataUrlPrefix.length + Math.ceil((MAX_EVALUATION_IMAGE_BYTES * 4) / 3) + 8;

  return (
    candidate.dataUrl.startsWith(dataUrlPrefix) &&
    candidate.dataUrl.length <= maxDataUrlLength
  );
}

export function getEvaluationImages(value: unknown): EvaluationImageInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isEvaluationImageInput)
    .slice(0, MAX_EVALUATION_IMAGES);
}
