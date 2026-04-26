import { NextResponse } from "next/server"

import { authErrorResponse, requireApprovedUser } from "@/lib/auth"
import { normalizeEvaluationLens } from "@/lib/persona-evaluation-lens"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import type { PersonaEvaluationLensItem } from "@/lib/types"
import {
  enforceUsageLimit,
  recordUsageEvent,
  usageLimitResponse,
} from "@/lib/usage-limits"

type PersonaPayload = {
  id?: string
  name: string
  role: string
  company_size?: string
  company_type?: string
  seniority?: string
  summary: string
  voice?: string
  goals?: string[]
  frustrations?: string[]
  evaluation_lens?: PersonaEvaluationLensItem[] | string[]
  quote?: string
  generation_prompt?: string
  source_type?: string
}

export async function POST(req: Request) {
  try {
    let auth
    try {
      auth = await requireApprovedUser()
    } catch (error) {
      return authErrorResponse(error)
    }

    const body: PersonaPayload = await req.json()

    const workspaceId = process.env.DEFAULT_WORKSPACE_ID
    const supabase = getSupabaseServerClient()

    if (!workspaceId || !supabase) {
      return NextResponse.json(
        { error: "Missing Supabase config" },
        { status: 500 },
      )
    }

    if (!body.name || !body.role || !body.summary) {
      return NextResponse.json(
        { error: "name, role, and summary are required" },
        { status: 400 },
      )
    }

    try {
      await enforceUsageLimit(auth, "persona_save")
    } catch (error) {
      const response = usageLimitResponse(error)
      if (response) {
        return response
      }

      throw error
    }

    const now = new Date().toISOString()
    const baseRow = {
      workspace_id: workspaceId,
      name: body.name,
      role: body.role,
      company_size: body.company_size ?? null,
      company_type: body.company_type ?? null,
      seniority: body.seniority ?? null,
      summary: body.summary,
      voice: body.voice ?? null,
      goals: body.goals ?? [],
      frustrations: body.frustrations ?? [],
      evaluation_lens: normalizeEvaluationLens(body.evaluation_lens),
      quote: body.quote ?? null,
      generation_prompt: body.generation_prompt ?? null,
      source_type: body.source_type ?? "generated",
      updated_at: now,
    }

    const insertRow = {
      ...baseRow,
      owner_id: auth.user.id,
    }

    const query = (() => {
      if (!body.id) {
        return supabase.from("personas").insert([insertRow]).select().single()
      }

      let updateQuery = supabase
        .from("personas")
        .update(baseRow)
        .eq("id", body.id)
        .eq("workspace_id", workspaceId)

      if (!auth.isAdmin) {
        updateQuery = updateQuery.eq("owner_id", auth.user.id)
      }

      return updateQuery.select().single()
    })()

    const { data, error } = await query

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 },
      )
    }

    const personaData = data as { id?: unknown }
    const personaId = typeof personaData.id === "string" ? personaData.id : null
    if (!personaId) {
      return NextResponse.json(
        { error: "Failed to save persona" },
        { status: 500 },
      )
    }

    await recordUsageEvent({
      userId: auth.user.id,
      eventType: "persona_save",
      entityId: personaId,
    })

    console.log("[persona-save] saved persona:\n" + JSON.stringify(data, null, 2))

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error("Save persona error:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    )
  }
}
