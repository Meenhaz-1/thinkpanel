# Persona Panel

Persona Panel is a decision-support web app that helps teams evaluate product ideas by creating personas, running ideas through those personas, and returning a clear recommendation with structured rationale.

The app is designed to feel calm and premium, but the core product principle is decision clarity:
- the verdict must be visually dominant
- the results must be understandable in seconds
- persona feedback must be specific, opinionated, and useful
- the app must stay stable while loading and rerunning evaluations

## Product Overview

Persona Panel supports three core workflows:

1. Create personas from a description.
2. Edit and save personas to Supabase.
3. Run an idea through selected personas and get a panel verdict with supporting breakdowns.

The app uses:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase for persistence
- OpenAI Responses API for persona generation and evaluation

There is no authentication in this V1.

## Current Routes

### Public and app routes
- `/` redirects to `/dashboard`
- `/dashboard`
- `/personas/new`
- `/personas/[id]`
- `/evaluations/new`
- `/evaluations/[id]`

### API routes
- `POST /api/personas/create`
- `POST /api/personas/save`
- `POST /api/evaluations/start`
- `POST /api/evaluations/run`
- `GET /api/evaluations/[id]/status`
- `GET /api/dashboard/personas`
- `GET /api/dashboard/evaluations`
- `GET /api/test`

## Key UX Behavior

### Dashboard
- Shows recent evaluations and saved personas
- Loads a limited first batch of each section
- Supports independent `Load more` for personas and evaluations
- Sorts personas by last updated
- Links each persona to its edit page

### Persona creation and editing
- The persona form supports both create and edit mode
- The description field clears its starter text on first focus in create mode
- Saving updates existing personas when an ID is present
- Labels include info icons with tooltips to help the user write better inputs

### Evaluation setup
- The idea field is validated before submission
- Persona selection is validated before submission
- Clicking `Run Panel` creates a pending evaluation immediately and routes to results without waiting for the LLM response

### Evaluation results
- The results page renders a stable shell first
- Skeletons appear before data loads
- The top verdict card is dominant
- Persona cards are useful when collapsed
- The first persona opens by default
- The app supports:
  - pending
  - running
  - completed
  - partial_error
  - failed
- The page polls evaluation status until the run completes

## Design Direction

The UI follows a restrained SaaS style:
- rounded cards
- subtle shadows
- lots of whitespace, but not excessive
- soft violet palette
- calm, premium feel
- minimal ornamentation

The original design references were used as a starting point, but the implementation intentionally keeps the interface less decorative and more product-focused.

## Prompting and AI Behavior

The project uses dedicated prompt files so they can be edited easily:
- `lib/prompts/persona-generation.ts`
- `lib/prompts/evaluation.ts`

### Persona generation prompt
The persona generation prompt instructs the model to:
- convert a description into a realistic persona
- keep behavior concrete and opinionated
- preserve tension and tradeoffs
- produce a usable voice, quote, goals, frustrations, and evaluation lens
- avoid generic language

### Evaluation prompt
The evaluation prompt instructs the model to:
- act like a decision-support engine
- treat user input as untrusted data
- avoid generic praise or generic risk statements
- force real tension across personas
- produce concise UI-friendly strings
- keep the verdict and score aligned

## Evaluation Payload Shape

The current persona evaluation payload includes:
- `persona_id`
- `verdict`
- `score`
- `reaction`
- `metadata`
- `what_lands`
- `why_i_push_back`
- `this_fails_if`
- `hidden_assumption`
- `questions_for_pm`
- `top_concern`
- `what_would_change_my_mind`
- `suggestion`

The evaluation response schema is strict and validated before rendering or saving.

## Validation and Safety

Persona Panel has a shared validation layer for both user input and model output.

### Input validation
The app validates user text before sending it to OpenAI.

It rejects things like:
- empty or very short input
- overly long input
- too many lines
- punctuation-only text
- repeated characters or repeated words
- instruction-like prompt injection
- URLs when not allowed
- code blocks when not allowed
- HTML/XML when not allowed
- JSON-like payloads when not allowed

### Validation error handling
The API returns clean validation errors in the form:
```json
{
  "error": "clean user-facing message",
  "code": "validation_code",
  "field": "field label"
}
```

The frontend maps these errors inline to the correct form field.

### Output safety
Generated model output is validated after parsing to catch obvious contamination or malformed data before it is returned or saved.

### Untrusted content handling
All user-provided text is wrapped as untrusted content before being sent to OpenAI.

### Safety identifier
The OpenAI requests include `safety_identifier` when the workspace ID is available.

## Score Rules

Persona scores are banded to the verdict so the score and verdict tell the same story:
- `love` = high
- `like` = above the middle
- `mixed` = mid-range
- `reject` = low

The top-level panel score is derived from the selected persona scores.

## Data Model

### `personas`
Saved persona profiles.

Important fields:
- `id`
- `workspace_id`
- `name`
- `role`
- `summary`
- `goals`
- `frustrations`
- `evaluation_lens`
- `voice`
- `company_size`
- `company_type`
- `seniority`
- `quote`
- `generation_prompt`
- `source_type`
- `created_at`
- `updated_at`

### `evaluations`
Evaluation run records.

Important fields:
- `id`
- `workspace_id`
- `title`
- `feature_description`
- `decision`
- `decision_summary`
- `why`
- `top_fixes`
- `confidence`
- `status`
- `stage`
- `selected_persona_ids`
- `error_message`
- `started_at`
- `completed_at`
- `created_at`

### `evaluation_persona_responses`
One response row per persona in an evaluation.

Important fields:
- `id`
- `evaluation_id`
- `persona_id`
- `verdict`
- `score`
- `reaction`
- `top_concern`
- `suggestion`
- `status`
- `error_message`
- `details`
- `created_at`

The `details` JSON payload currently stores:
- metadata
- what_lands
- why_i_push_back
- this_fails_if
- hidden_assumption
- questions_for_pm
- what_would_change_my_mind

## Dashboard Pagination

The dashboard now uses server-backed pagination.

### Behavior
- Initial load only fetches a limited number of personas and evaluations
- Each section has its own `Load more` button
- Loaded items are appended, not replaced
- Each section tracks its own `hasMore`, `nextOffset`, and loading state

### Default page size
- 8 personas
- 8 evaluations

## Important Implementation Files

### App and page files
- `app/(app)/dashboard/page.tsx`
- `app/(app)/personas/new/page.tsx`
- `app/(app)/personas/[id]/page.tsx`
- `app/(app)/evaluations/new/page.tsx`
- `app/(app)/evaluations/[id]/page.tsx`

### API routes
- `app/api/personas/create/route.ts`
- `app/api/personas/save/route.ts`
- `app/api/evaluations/start/route.ts`
- `app/api/evaluations/run/route.ts`
- `app/api/evaluations/[id]/status/route.ts`
- `app/api/dashboard/personas/route.ts`
- `app/api/dashboard/evaluations/route.ts`

### Prompt files
- `lib/prompts/persona-generation.ts`
- `lib/prompts/evaluation.ts`

### Data helpers
- `lib/get-personas.ts`
- `lib/get-evaluations.ts`
- `lib/mock-data.ts`
- `lib/types.ts`

### Safety and validation helpers
- `lib/llm-validation.ts`
- `lib/api-validation.ts`

### UI components
- `components/personas/persona-builder.tsx`
- `components/personas/persona-avatar.tsx`
- `components/evaluations/new-evaluation-form.tsx`
- `components/evaluations/evaluation-results-client.tsx`
- `components/evaluations/persona-result-card.tsx`
- `components/evaluations/persona-selector-item.tsx`
- `components/dashboard/dashboard-collections.tsx`

## Supabase Migrations

Important migration files in the repo:
- `supabase/migrations/20260422_required_app_schema.sql`
- `supabase/migrations/20260422_persona_evaluation_details_shape.sql`
- `supabase/migrations/20260422_evaluation_persona_response_details_shape.sql`

These migrations cover the current schema expectations for:
- persona profile fields
- evaluation run state
- selected persona IDs
- error messages
- completed timestamps
- richer persona evaluation JSON details

## Development Setup

```bash
npm install
npm run dev
```

### Useful checks
```bash
npm run lint
npm run build
```

## Environment Variables

The app expects environment variables for:
- OpenAI API access
- Supabase URL and keys
- Default workspace ID

Keep secrets in `.env.local`. The repo ignores `.env*` files.

## Current Model Choice

The app currently uses:
- `gpt-4.1`

for both persona generation and evaluation.

## Current Status

The project is in a working state with:
- persona creation and editing
- pending evaluation runs
- results polling and progressive hydration
- Supabase persistence
- dashboard pagination
- strict validation and output safety

The app has been verified with:
- `npm run lint`
- `npm run build`

## Notes for Contributors

- Keep prompt edits in the prompt files, not in route handlers.
- Keep validation strict; do not loosen it casually.
- Keep the results page decision-first and compact.
- Keep dashboard and results loading stable to avoid layout shift.
- If you change persona evaluation payloads, update:
  - shared types
  - route schema
  - fallback/mock data
  - results UI
  - persistence shape

