# Persona Panel

Persona Panel is a decision-support app that creates personas, runs ideas through a panel, and returns a clear recommendation with supporting rationale.

## Development

```bash
npm install
npm run dev
```

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- OpenAI Responses API

## Notes

- Personas can be created and edited from the dashboard.
- Evaluations use a pending-run flow and persist results in Supabase.
- Migrations live in `supabase/migrations`.
