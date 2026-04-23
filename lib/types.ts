export type Verdict = "ship" | "risky" | "reject";

export type EvaluationDecision = Verdict;

export type PersonaVerdict = "love" | "like" | "mixed" | "reject";

export type EvaluationStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial_error"
  | "failed";

export type EvaluationStage =
  | "Preparing panel"
  | "Evaluating idea"
  | "Gathering persona reactions"
  | "Finalizing recommendations";

export type PersonaEvaluationStatus = "pending" | "completed" | "failed";

export type PersonaEvaluationMetadata = {
  role: string;
  company: string;
  device: string;
  usage: string;
  evaluation_lens: string;
};

export type PersonaEvaluationDetails = {
  metadata: PersonaEvaluationMetadata;
  what_lands: string[];
  why_i_push_back: string[];
  this_fails_if: string[];
  hidden_assumption: string;
  questions_for_pm: string[];
  what_would_change_my_mind: string;
};

export type PersonaEvaluationLensItem = {
  criterion: string;
  why_it_matters: string;
  tradeoff: string;
};

export type Persona = {
  id: string;
  name: string;
  role: string;
  summary: string;
  goals: string[];
  frustrations: string[];
  evaluationLens: PersonaEvaluationLensItem[];
  voice: string;
  companySize?: string | null;
  companyType?: string | null;
  seniority?: string | null;
  quote?: string | null;
  generationPrompt?: string | null;
  sourceType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PersonaGenerated = {
  name: string;
  role: string;
  company_size: string | null;
  company_type: string | null;
  seniority: string | null;
  summary: string;
  voice: string | null;
  goals: string[];
  frustrations: string[];
  evaluation_lens: PersonaEvaluationLensItem[];
  quote: string | null;
};

export type PersonaDraft = {
  description: string;
  generatedPersona: PersonaGenerated;
};

export type EvaluationRunRequest = {
  feature_description: string;
  persona_ids: string[];
};

export type EvaluationExecutionRequest = {
  evaluation_id: string;
};

export type PersonaEvaluation = {
  persona_id: string;
  verdict: PersonaVerdict;
  score: number;
  reaction: string;
  top_concern: string;
  suggestion: string;
} & PersonaEvaluationDetails;

export type EvaluationResult = {
  decision: EvaluationDecision;
  decision_summary: string;
  why: string[];
  top_fixes: string[];
  confidence: number;
  personas: PersonaEvaluation[];
};

export type EvaluationSummary = {
  id: string;
  title: string;
  verdict: EvaluationDecision;
  createdAt: string;
  summary: string;
  selectedPersonaIds: string[];
};

export type EvaluationSummaryState = {
  id: string;
  title: string;
  status: EvaluationStatus;
  stage: EvaluationStage | null;
  createdAt: string;
  summary: string;
  selectedPersonaIds: string[];
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

export type EvaluationDraft = {
  id: string;
  idea: string;
  selectedPersonaIds: string[];
};

export type RuntimePersonaEvaluation = {
  persona: Persona;
  status: PersonaEvaluationStatus;
  evaluation: PersonaEvaluation | null;
  errorMessage: string | null;
};

export type EvaluationRuntimeDetail = {
  id: string;
  title: string;
  feature_description: string;
  status: EvaluationStatus;
  stage: EvaluationStage | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  decision: EvaluationDecision | null;
  decision_summary: string | null;
  why: string[];
  top_fixes: string[];
  confidence: number | null;
  selectedPersonaIds: string[];
  personaEvaluations: RuntimePersonaEvaluation[];
};

export type EvaluationRecord = {
  id: string;
  workspace_id: string;
  title: string | null;
  feature_description: string;
  decision: EvaluationDecision | null;
  decision_summary: string | null;
  why: string[] | null;
  top_fixes: string[] | null;
  confidence: number | null;
  status?: EvaluationStatus | null;
  stage?: EvaluationStage | null;
  selected_persona_ids?: string[] | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
};

export type EvaluationPersonaResponseRecord = {
  id: string;
  evaluation_id: string;
  persona_id: string;
  verdict: PersonaVerdict;
  score: number;
  reaction: string;
  top_concern: string;
  suggestion: string;
  details: PersonaEvaluationDetails | null;
  status?: PersonaEvaluationStatus | null;
  error_message?: string | null;
  created_at: string;
};
