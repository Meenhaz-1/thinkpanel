export type ValidationErrorCode =
  | "required"
  | "invalid_type"
  | "too_short"
  | "too_long"
  | "too_many_lines"
  | "instruction_like"
  | "disallowed_format"
  | "low_signal"
  | "repetitive";

export type LLMValidationContext = {
  endpoint: string;
  fieldLabel: string;
};

export type UserInputValidationOptions = {
  minLength?: number;
  maxLength?: number;
  maxLines?: number;
  minWords?: number;
  minUniqueWords?: number;
  allowUrls?: boolean;
  allowCodeBlocks?: boolean;
  allowHtml?: boolean;
  allowJsonLikeContent?: boolean;
  rejectInstructionLikePatterns?: boolean;
  rejectOnlyPunctuation?: boolean;
  rejectRepeatedCharacters?: boolean;
  rejectRepeatedWords?: boolean;
};

export type ValidationFailureContext = {
  field: string;
  code: ValidationErrorCode;
  internalReason: string;
  userMessage: string;
};

export function wrapUntrustedUserInput(fieldLabel: string, value: string): string {
  return `UNTRUSTED ${fieldLabel.toUpperCase()} START\n${value}\nUNTRUSTED ${fieldLabel.toUpperCase()} END`;
}

export class UserInputValidationError extends Error {
  code: ValidationErrorCode;
  field: string;
  userMessage: string;
  internalReason: string;

  constructor({ code, field, userMessage, internalReason }: ValidationFailureContext) {
    super(userMessage);
    this.name = "UserInputValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
    this.field = field;
    this.userMessage = userMessage;
    this.internalReason = internalReason;
  }
}

export class LLMOutputSafetyError extends Error {
  field: string;
  internalReason: string;

  constructor(field: string, internalReason: string) {
    super("Unsafe model output detected");
    this.name = "LLMOutputSafetyError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.field = field;
    this.internalReason = internalReason;
  }
}

function buildValidationMessage(
  code: ValidationErrorCode,
  fieldLabel: string,
): string {
  const lowerLabel = fieldLabel.toLowerCase();

  switch (code) {
    case "required":
      return `Please enter ${articleForField(lowerLabel)} ${fieldLabel}.`;
    case "invalid_type":
      return `Please enter text for the ${fieldLabel}.`;
    case "too_short":
      if (lowerLabel.includes("persona")) {
        return "Please add more detail to the persona description so it can be evaluated properly.";
      }
      if (lowerLabel.includes("idea")) {
        return "Please add more detail to the idea so it can be evaluated properly.";
      }
      return `Please add more detail to the ${fieldLabel}.`;
    case "too_long":
      return `Please shorten the ${fieldLabel}.`;
    case "too_many_lines":
      return `Please keep the ${fieldLabel} to fewer lines.`;
    case "instruction_like":
      if (lowerLabel.includes("persona")) {
        return "Please describe the persona directly without including instructions for the AI.";
      }
      return `Please describe the ${fieldLabel} directly without instructions for the AI.`;
    case "disallowed_format":
      if (lowerLabel.includes("idea")) {
        return "Please remove code, markup, or structured payloads from the idea.";
      }
      return `Please remove code, markup, or structured payloads from the ${fieldLabel}.`;
    case "low_signal":
      if (lowerLabel.includes("persona")) {
        return "Please make the persona description more specific by describing behaviors, goals, constraints, or frustrations.";
      }
      if (lowerLabel.includes("idea")) {
        return "Please add enough detail to describe the idea clearly.";
      }
      return `Please add more specific detail to the ${fieldLabel}.`;
    case "repetitive":
      return `Please rewrite the ${fieldLabel} with more varied, specific wording.`;
    default:
      return `Please revise the ${fieldLabel}.`;
  }
}

export function getUserValidationMessage(
  code: ValidationErrorCode,
  context: LLMValidationContext,
): string {
  return buildValidationMessage(code, context.fieldLabel);
}

function articleForField(fieldLabel: string) {
  return /^[aeiou]/i.test(fieldLabel) ? "an" : "a";
}

function buildValidationError(
  code: ValidationErrorCode,
  context: LLMValidationContext,
  internalReason: string,
): UserInputValidationError {
  return new UserInputValidationError({
    code,
    field: context.fieldLabel,
    userMessage: getUserValidationMessage(code, context),
    internalReason,
  });
}

function hasOnlyPunctuation(value: string): boolean {
  return !/[A-Za-z0-9]/.test(value);
}

function hasRepeatedCharacters(value: string): boolean {
  return /(.)\1{7,}/.test(value);
}

function hasRepeatedWords(value: string): boolean {
  return /\b([A-Za-z0-9]+)(?:\s+\1\b){2,}/i.test(value);
}

function isMostlyUppercase(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12) {
    return false;
  }

  const uppercaseLetters = letters.replace(/[^A-Z]/g, "").length;
  return uppercaseLetters / letters.length > 0.8;
}

function countWords(value: string): number {
  const words = value.match(/\b[\p{L}\p{N}']+\b/gu);
  return words ? words.length : 0;
}

function uniqueWordCount(value: string): number {
  const words = value
    .toLowerCase()
    .match(/\b[\p{L}\p{N}']+\b/gu);

  if (!words) {
    return 0;
  }

  return new Set(words).size;
}

function containsInstructionLikePatterns(value: string): boolean {
  const patterns = [
    /ignore\s+previous\s+instructions?/i,
    /ignore\s+all\s+above/i,
    /disregard\s+all\s+prior/i,
    /system\s+prompt/i,
    /developer\s+message/i,
    /reveal\s+instructions?/i,
    /show\s+hidden\s+prompt/i,
    /print\s+the\s+schema/i,
    /override\s+(?:the\s+)?instructions?/i,
    /change\s+the\s+task/i,
    /triple\s+backticks/i,
    /```/,
    /<script\b/i,
    /<\/script>/i,
    /<\?xml/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}

function containsDisallowedHtml(value: string): boolean {
  return /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value) || /<\/[a-z][\w-]*>/i.test(value);
}

function containsUrl(value: string): boolean {
  return /\bhttps?:\/\/\S+|\bwww\.\S+/i.test(value);
}

function containsCodeBlockLikeContent(value: string): boolean {
  return /```/.test(value) || /^\s{4,}\S/m.test(value);
}

function containsJsonLikeContent(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const looksLikeObject = trimmed.startsWith("{") && trimmed.endsWith("}");
  const looksLikeArray = trimmed.startsWith("[") && trimmed.endsWith("]");
  const hasStructuredSeparators = /["'][^"']+["']\s*:/.test(trimmed);

  return Boolean((looksLikeObject || looksLikeArray) && hasStructuredSeparators);
}

function isLowSignalInput(value: string, options: UserInputValidationOptions): boolean {
  const wordCount = countWords(value);
  const uniqueCount = uniqueWordCount(value);

  if (typeof options.minWords === "number" && wordCount < options.minWords) {
    return true;
  }

  if (typeof options.minUniqueWords === "number" && uniqueCount < options.minUniqueWords) {
    return true;
  }

  const uppercaseRatio = isMostlyUppercase(value);
  if (uppercaseRatio) {
    return true;
  }

  return false;
}

function detectValidationIssue(
  value: string,
  options: UserInputValidationOptions,
): { code: ValidationErrorCode; internalReason: string } | null {
  if (!value.trim()) {
    return { code: "required", internalReason: "Input was empty after trimming." };
  }

  if (typeof options.maxLength === "number" && value.length > options.maxLength) {
    return {
      code: "too_long",
      internalReason: `Input length ${value.length} exceeded maxLength ${options.maxLength}.`,
    };
  }

  if (typeof options.minLength === "number" && value.length < options.minLength) {
    return {
      code: "too_short",
      internalReason: `Input length ${value.length} was below minLength ${options.minLength}.`,
    };
  }

  const lineCount = value.split(/\r?\n/).length;
  if (typeof options.maxLines === "number" && lineCount > options.maxLines) {
    return {
      code: "too_many_lines",
      internalReason: `Input line count ${lineCount} exceeded maxLines ${options.maxLines}.`,
    };
  }

  if (options.rejectOnlyPunctuation !== false && hasOnlyPunctuation(value)) {
    return {
      code: "low_signal",
      internalReason: "Input contained no letters or numbers.",
    };
  }

  if (options.rejectRepeatedCharacters !== false && hasRepeatedCharacters(value)) {
    return {
      code: "repetitive",
      internalReason: "Input contained long repeated character runs.",
    };
  }

  if (options.rejectRepeatedWords !== false && hasRepeatedWords(value)) {
    return {
      code: "repetitive",
      internalReason: "Input repeated the same word multiple times in sequence.",
    };
  }

  if (options.rejectInstructionLikePatterns !== false && containsInstructionLikePatterns(value)) {
    return {
      code: "instruction_like",
      internalReason: "Input matched a known instruction-injection pattern.",
    };
  }

  if (!options.allowUrls && containsUrl(value)) {
    return {
      code: "disallowed_format",
      internalReason: "Input contained a URL but URLs are not allowed.",
    };
  }

  if (!options.allowCodeBlocks && containsCodeBlockLikeContent(value)) {
    return {
      code: "disallowed_format",
      internalReason: "Input contained code block-like content.",
    };
  }

  if (!options.allowHtml && containsDisallowedHtml(value)) {
    return {
      code: "disallowed_format",
      internalReason: "Input contained HTML or XML-like markup.",
    };
  }

  if (!options.allowJsonLikeContent && containsJsonLikeContent(value)) {
    return {
      code: "disallowed_format",
      internalReason: "Input looked like structured JSON payload content.",
    };
  }

  if (isLowSignalInput(value, options)) {
    return {
      code: "low_signal",
      internalReason: "Input did not contain enough specific context for evaluation.",
    };
  }

  return null;
}

export function validateUserLLMInput(
  value: unknown,
  context: LLMValidationContext,
  options: UserInputValidationOptions = {},
): string {
  if (value === null || value === undefined) {
    throw buildValidationError(
      "required",
      context,
      `Input was missing for ${context.fieldLabel}.`,
    );
  }

  if (typeof value !== "string") {
    throw buildValidationError(
      "invalid_type",
      context,
      `Expected a string for ${context.fieldLabel}.`,
    );
  }

  const normalized = value.trim();
  const issue = detectValidationIssue(normalized, options);

  if (issue) {
    throw buildValidationError(issue.code, context, issue.internalReason);
  }

  return normalized;
}

function containsUnsafeGeneratedText(value: string): string | null {
  const patterns = [
    /ignore\s+previous\s+instructions?/i,
    /ignore\s+all\s+above/i,
    /disregard\s+all\s+prior/i,
    /system\s+prompt/i,
    /developer\s+message/i,
    /reveal\s+instructions?/i,
    /show\s+hidden\s+prompt/i,
    /print\s+the\s+schema/i,
    /```/,
    /<script\b/i,
    /<\/script>/i,
  ];

  const match = patterns.find((pattern) => pattern.test(value));
  return match ? `Matched unsafe output pattern: ${match}` : null;
}

export function validateGeneratedLLMOutput(
  value: unknown,
  fieldName: string,
): void {
  const visit = (candidate: unknown, path: string): void => {
    if (typeof candidate === "string") {
      const issue = containsUnsafeGeneratedText(candidate);
      if (issue) {
        throw new LLMOutputSafetyError(`${fieldName}${path}`, issue);
      }
      return;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    if (candidate && typeof candidate === "object") {
      for (const [key, nested] of Object.entries(candidate)) {
        visit(nested, path ? `${path}.${key}` : `.${key}`);
      }
    }
  };

  visit(value, "");
}
