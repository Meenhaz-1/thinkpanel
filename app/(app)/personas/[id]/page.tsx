import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PersonaBuilder } from "@/components/personas/persona-builder";
import { PageContainer } from "@/components/ui/page-container";
import { generatedPersonaDraft } from "@/lib/mock-data";
import { getPersonasByIds } from "@/lib/get-personas";
import { requireApprovedUser } from "@/lib/auth";

type EditPersonaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPersonaPage({ params }: EditPersonaPageProps) {
  const auth = await requireApprovedUser({ touch: false });
  const { id } = await params;
  const [persona] = await getPersonasByIds([id], {
    fallbackToMock: true,
    viewer: auth.viewer,
  });

  if (!persona) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Personas"
        title="Edit Persona"
        description="Review the persona, make your changes, and save it back to the panel."
      />
      <PersonaBuilder
        initialDraft={generatedPersonaDraft}
        initialPersona={persona}
      />
    </PageContainer>
  );
}
