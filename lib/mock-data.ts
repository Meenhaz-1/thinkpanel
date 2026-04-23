import type {
  EvaluationDraft,
  EvaluationResult,
  EvaluationSummary,
  PersonaEvaluationLensItem,
  Persona,
  PersonaDraft,
} from "@/lib/types";

export const personas: Persona[] = [
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    role: "Tech Executive",
    summary:
      "A pragmatic technology leader who values clear business outcomes, clean rollout plans, and tight execution.",
    goals: [
      "Reduce operational drag for product teams",
      "See measurable business value within a quarter",
    ],
    frustrations: [
      "Ideas that sound ambitious but ignore implementation cost",
      "Messaging that is vague about ownership and rollout risk",
    ],
    evaluationLens: [
      {
        criterion: "Strategic fit",
        why_it_matters: "It has to support a business priority, not just look useful.",
        tradeoff: "A narrower scope may be easier to approve than a broader platform play.",
      },
      {
        criterion: "Operational complexity",
        why_it_matters: "He wants to know how much process change this adds.",
        tradeoff: "Better control can come with more coordination overhead.",
      },
      {
        criterion: "Executive clarity",
        why_it_matters: "He needs to explain the decision in one clean sentence.",
        tradeoff: "A richer workflow may be harder to summarize for leadership.",
      },
    ] satisfies PersonaEvaluationLensItem[],
    voice: "Direct, concise, and commercially focused.",
    updatedAt: "2026-04-22T12:20:00Z",
  },
  {
    id: "aria-vance",
    name: "Aria Vance",
    role: "Creative Director",
    summary:
      "A brand-minded leader who looks for emotional clarity, strong storytelling, and polished user-facing experiences.",
    goals: [
      "Create a memorable first impression",
      "Ensure the product feels clear and premium",
    ],
    frustrations: [
      "Overloaded interfaces",
      "Weak differentiation and generic value propositions",
    ],
    evaluationLens: [
      {
        criterion: "Clarity",
        why_it_matters: "She wants the value proposition to land immediately.",
        tradeoff: "Too much nuance can make the product feel diluted.",
      },
      {
        criterion: "Brand expression",
        why_it_matters: "The interface should feel distinct and intentional.",
        tradeoff: "A stronger visual voice can raise expectations for polish.",
      },
      {
        criterion: "User delight",
        why_it_matters: "The product should create a memorable first impression.",
        tradeoff: "More delight can sometimes compete with speed and simplicity.",
      },
    ] satisfies PersonaEvaluationLensItem[],
    voice: "Optimistic, expressive, and quick to spot narrative gaps.",
    updatedAt: "2026-04-22T12:45:00Z",
  },
  {
    id: "elena-rodriguez",
    name: "Elena Rodriguez",
    role: "Financial Analyst",
    summary:
      "A disciplined evaluator who checks for margin impact, cost control, and realistic adoption assumptions.",
    goals: [
      "Understand the risk-reward profile quickly",
      "Avoid avoidable spend before validation",
    ],
    frustrations: [
      "Plans with fuzzy success metrics",
      "Features that add cost without changing customer behavior",
    ],
    evaluationLens: [
      {
        criterion: "ROI",
        why_it_matters: "She needs to justify spend with a clear return path.",
        tradeoff: "A conservative launch may be slower but easier to defend.",
      },
      {
        criterion: "Adoption risk",
        why_it_matters: "If teams do not use it, the economics do not work.",
        tradeoff: "Tighter controls can reduce adoption friction but lower flexibility.",
      },
      {
        criterion: "Cost discipline",
        why_it_matters: "Extra tooling has to earn its keep quickly.",
        tradeoff: "A more ambitious product may cost more before it proves value.",
      },
    ] satisfies PersonaEvaluationLensItem[],
    voice: "Measured, analytical, and evidence-driven.",
    updatedAt: "2026-04-22T12:05:00Z",
  },
  {
    id: "devon-brooks",
    name: "Devon Brooks",
    role: "Operations Lead",
    summary:
      "A systems thinker who cares about workflow fit, support load, and the realities of cross-functional execution.",
    goals: [
      "Keep team workflows simple and dependable",
      "Minimize training and support burden",
    ],
    frustrations: [
      "Rollouts that change too many habits at once",
      "Products that depend on manual workarounds",
    ],
    evaluationLens: [
      {
        criterion: "Workflow fit",
        why_it_matters: "It has to slot into how the team already works.",
        tradeoff: "A cleaner rollout can mean fewer customization options.",
      },
      {
        criterion: "Support burden",
        why_it_matters: "He is judged on how many problems the team creates.",
        tradeoff: "More automation may reduce manual effort but add edge cases.",
      },
      {
        criterion: "Execution readiness",
        why_it_matters: "He wants to know if the team can actually ship this.",
        tradeoff: "The product may need to stay smaller to stay realistic.",
      },
    ] satisfies PersonaEvaluationLensItem[],
    voice: "Calm, practical, and implementation-aware.",
    updatedAt: "2026-04-22T12:50:00Z",
  },
];

export const evaluationSummaries: EvaluationSummary[] = [
  {
    id: "phoenix",
    title: "Project Phoenix Launch",
    verdict: "ship",
    createdAt: "2 hours ago",
    summary: "Strong panel support after tightening rollout scope and onboarding.",
    selectedPersonaIds: ["marcus-chen", "aria-vance", "elena-rodriguez"],
  },
  {
    id: "atlas",
    title: "Atlas Workspace Redesign",
    verdict: "risky",
    createdAt: "Yesterday",
    summary: "Promising concept, but rollout friction still feels high.",
    selectedPersonaIds: ["aria-vance", "devon-brooks"],
  },
  {
    id: "northstar",
    title: "Northstar Pricing Refresh",
    verdict: "reject",
    createdAt: "4 days ago",
    summary: "Panel saw weak customer clarity and too much conversion risk.",
    selectedPersonaIds: ["marcus-chen", "elena-rodriguez"],
  },
];

export const evaluationDrafts: Record<string, EvaluationDraft> = {
  phoenix: {
    id: "phoenix",
    idea:
      "A guided onboarding and decision workspace that helps product teams run major launch decisions through cross-functional personas before committing roadmap time.",
    selectedPersonaIds: ["marcus-chen", "aria-vance", "elena-rodriguez"],
  },
  blank: {
    id: "blank",
    idea: "",
    selectedPersonaIds: [],
  },
};

export const evaluationResults: Record<string, EvaluationResult> = {
  phoenix: {
    decision: "ship",
    decision_summary:
      "The concept is clear, useful, and differentiated enough to move forward if onboarding and rollout scope stay disciplined.",
    why: [
      "The panel sees a real decision-making pain point and a credible audience for it.",
      "The value proposition is easy to explain in one sentence without extra framing.",
      "Concerns are concentrated in execution details, not in the core idea itself.",
    ],
    top_fixes: [
      "Tighten the first-run experience so setup takes minutes, not a full workflow redesign.",
      "Show one sample evaluation up front to make the product payoff obvious immediately.",
      "Define a narrower V1 audience so launch messaging stays precise.",
    ],
    confidence: 88,
    personas: [
      {
        persona_id: "marcus-chen",
        verdict: "like",
        score: 89,
        reaction: "Useful for leadership, but only if setup stays tightly controlled.",
        metadata: {
          role: "Tech Executive",
          company: "Mid-market SaaS",
          device: "Desktop",
          usage: "Weekly",
          evaluation_lens: "Strategic fit, execution risk, and leadership clarity",
        },
        what_lands: [
          "The decision framing is easy to explain to other leaders.",
          "The panel helps align product, finance, and operations on one outcome.",
          "The rollout can be positioned as a disciplined planning tool.",
        ],
        why_i_push_back: [
          "The setup could get too broad before the first useful result appears.",
          "If there are too many persona inputs, leaders may ignore the workflow.",
          "I still need proof this saves time instead of adding another meeting.",
        ],
        this_fails_if: [
          "This fails if the first useful evaluation takes more than a couple of minutes.",
          "This fails if leaders need a manual walkthrough for every launch decision.",
        ],
        hidden_assumption:
          "It assumes executives will trust a panel result enough to use it without debating the method.",
        questions_for_pm: [
          "How fast can I get to the first decision?",
          "Can I constrain this to a single high-stakes launch type?",
          "What evidence shows this changes decision quality?",
        ],
        what_would_change_my_mind:
          "Show a setup that produces a useful decision in one short session, without extra workshops.",
        top_concern: "The workflow could feel too broad if setup asks for too much context.",
        suggestion: "Launch with a narrower template flow for one primary decision type.",
      },
      {
        persona_id: "aria-vance",
        verdict: "love",
        score: 86,
        reaction: "The product promise feels sharp and easy to imagine in a real workflow.",
        metadata: {
          role: "Creative Director",
          company: "Design-led startup",
          device: "Laptop",
          usage: "Daily",
          evaluation_lens: "Clarity, brand expression, and user delight",
        },
        what_lands: [
          "The verdict moment feels like the heart of the experience.",
          "The layout has enough breathing room to feel premium.",
          "The product story is simple enough to show to a team quickly.",
        ],
        why_i_push_back: [
          "The interface could blur into a generic analytics dashboard.",
          "If the verdict card is not dominant, the whole product loses impact.",
          "The supporting detail needs enough polish to feel credible.",
        ],
        this_fails_if: [
          "This fails if the decision card is not the first thing people notice.",
          "This fails if the persona detail turns into a wall of text.",
        ],
        hidden_assumption:
          "It assumes people want the result to feel like a polished product moment rather than a plain report.",
        questions_for_pm: [
          "How will you keep the decision card visually first?",
          "Can the persona detail feel cinematic without becoming cluttered?",
          "What makes this feel distinct from a generic report?",
        ],
        what_would_change_my_mind:
          "Show a clearer visual hierarchy where the verdict remains the obvious focal point on first glance.",
        top_concern: "The interface could become generic if the verdict moment is buried.",
        suggestion: "Keep the decision summary bold, immediate, and visually unmistakable.",
      },
      {
        persona_id: "elena-rodriguez",
        verdict: "mixed",
        score: 68,
        reaction: "There is a real use case, but the efficiency case still needs proof.",
        metadata: {
          role: "Financial Analyst",
          company: "Enterprise services",
          device: "Desktop",
          usage: "Weekly",
          evaluation_lens: "ROI, adoption risk, and cost discipline",
        },
        what_lands: [
          "The panel creates a clearer decision trail than a loose discussion.",
          "The output could reduce rework if it consistently drives alignment.",
          "The structure makes it easier to compare options quickly.",
        ],
        why_i_push_back: [
          "I do not yet see concrete efficiency gains that justify adoption.",
          "If results feel subjective, finance teams will discount them.",
          "The cost of maintaining the process could outweigh the benefit.",
        ],
        this_fails_if: [
          "This fails if the panel cannot show a measurable time saving.",
          "This fails if finance teams still need to manually verify the recommendation.",
        ],
        hidden_assumption:
          "It assumes the organization will accept a qualitative panel result as evidence worth acting on.",
        questions_for_pm: [
          "What measurable time savings does this create?",
          "How do you prove this is more than a polished opinion generator?",
          "What is the expected payback period?",
        ],
        what_would_change_my_mind:
          "Show evidence that the panel shortens decision cycles without adding review overhead.",
        top_concern: "Teams may hesitate if they cannot see near-term efficiency gains.",
        suggestion: "Add outcome-oriented proof points tied to avoided rework or faster alignment.",
      },
    ],
  },
};

export const emptyEvaluationSummaries: EvaluationSummary[] = [];

export const emptyPersonas: Persona[] = [];

export const generatedPersonaDraft: PersonaDraft = {
  description:
    "A senior technical architect at a Fortune 500 company who is skeptical of new AI-heavy tools but values precision, accountability, and long-term stability.",
  generatedPersona: {
    name: "Avery Stone",
    role: "Enterprise Systems Architect",
    company_size: "Enterprise",
    company_type: "B2B Software",
    seniority: "Senior",
    summary:
      "A senior infrastructure stakeholder who evaluates new tools through the lens of reliability, governance, and long-term maintainability.",
    voice: "Cautious, precise, and grounded in real enterprise constraints.",
    goals: [
      "Protect stability for high-stakes internal systems",
      "Adopt tools that reduce friction without weakening controls",
    ],
    frustrations: [
      "Overpromised automation claims",
      "New products with shallow documentation",
    ],
    evaluation_lens: [
      {
        criterion: "Implementation realism",
        why_it_matters: "She needs the plan to match actual engineering effort.",
        tradeoff: "A tighter scope is easier to ship but may prove less.",
      },
      {
        criterion: "Risk visibility",
        why_it_matters: "Hidden failure modes are what she looks for first.",
        tradeoff: "More upfront scrutiny can slow the path to launch.",
      },
      {
        criterion: "Operational durability",
        why_it_matters: "The workflow has to survive real team usage.",
        tradeoff: "A durable system may require more setup discipline.",
      },
    ] satisfies PersonaEvaluationLensItem[],
    quote: "If this can reduce risk without creating more process, I’m interested.",
  },
};

export function getPersonaById(id: string) {
  return personas.find((persona) => persona.id === id);
}

export function getDraftById(id?: string) {
  if (!id) {
    return evaluationDrafts.blank;
  }

  return evaluationDrafts[id] ?? evaluationDrafts.blank;
}
