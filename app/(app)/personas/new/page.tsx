import { PageHeader } from "@/components/layout/page-header";
import { PersonaBuilder } from "@/components/personas/persona-builder";
import { PageContainer } from "@/components/ui/page-container";
import { generatedPersonaDraft } from "@/lib/mock-data";

export default function NewPersonaPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Personas"
        title="Create Persona"
        description="Describe the kind of person you want feedback from, then refine the draft into something useful and scannable."
      />
      <PersonaBuilder initialDraft={generatedPersonaDraft} />
    </PageContainer>
  );
}
