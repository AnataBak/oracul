import { GEMINI_TEXT_MODEL_CHAIN } from "@/lib/gemini-models"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

export type GeminiInlineImage = {
  mimeType: string
  data: string
}

const MAX_PASSES = 2
const PASS_DELAY_MS = 1500

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

function buildGeminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class GeminiCallError extends Error {
  readonly model: string
  readonly status: number
  readonly body: string
  readonly isPermanent: boolean

  constructor(model: string, status: number, body: string, isPermanent: boolean) {
    super(`Gemini request failed for ${model}: ${body}`)
    this.name = "GeminiCallError"
    this.model = model
    this.status = status
    this.body = body
    this.isPermanent = isPermanent
  }
}

function classifyFailure(status: number, body: string): { isPermanent: boolean } {
  const normalizedBody = body.toLowerCase()

  if (status === 404 || status === 400) {
    return { isPermanent: true }
  }

  if (status === 429) {
    if (
      normalizedBody.includes("limit: 0") ||
      normalizedBody.includes("perdayperprojectpermodel") ||
      normalizedBody.includes("perday")
    ) {
      return { isPermanent: true }
    }

    return { isPermanent: false }
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return { isPermanent: false }
  }

  if (
    normalizedBody.includes("high demand") ||
    normalizedBody.includes("overloaded") ||
    normalizedBody.includes("unavailable") ||
    normalizedBody.includes("temporarily")
  ) {
    return { isPermanent: false }
  }

  return { isPermanent: true }
}

async function requestGeminiModel(
  model: string,
  prompt: string,
  temperature: number,
  image?: GeminiInlineImage,
): Promise<string> {
  let response: Response
  const parts = image
    ? [
        {
          inline_data: {
            mime_type: image.mimeType,
            data: image.data,
          },
        },
        { text: prompt },
      ]
    : [{ text: prompt }]

  try {
    response = await fetch(buildGeminiUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature,
        },
      }),
      cache: "no-store",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed"
    throw new GeminiCallError(model, 0, message, false)
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response)
    const { isPermanent } = classifyFailure(response.status, errorBody)
    throw new GeminiCallError(model, response.status, errorBody, isPermanent)
  }

  const data = (await response.json()) as GeminiResponse
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!content) {
    throw new GeminiCallError(model, response.status, "Gemini returned an empty response", true)
  }

  return content
}

export interface GeminiTextResult {
  text: string
  modelUsed: string
}

export async function requestGeminiText(
  prompt: string,
  temperature: number,
  image?: GeminiInlineImage,
  modelChain?: readonly string[],
): Promise<GeminiTextResult> {
  const effectiveChain =
    modelChain && modelChain.length > 0 ? modelChain : GEMINI_TEXT_MODEL_CHAIN

  const failuresByModel = new Map<string, string>()
  const permanentlyDead = new Set<string>()

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let hadTransientThisPass = false

    for (const model of effectiveChain) {
      if (permanentlyDead.has(model)) {
        continue
      }

      try {
        const text = await requestGeminiModel(model, prompt, temperature, image)
        return { text, modelUsed: model }
      } catch (error) {
        if (!(error instanceof GeminiCallError)) {
          throw error
        }

        failuresByModel.set(model, error.message)

        if (error.isPermanent) {
          permanentlyDead.add(model)
        } else {
          hadTransientThisPass = true
        }

        if (pass === 0) {
          console.warn(
            `${model} failed (status ${error.status}, permanent=${error.isPermanent}). Continuing chain.`,
          )
        }
      }
    }

    if (!hadTransientThisPass) {
      break
    }

    if (pass + 1 < MAX_PASSES) {
      console.warn(
        `All models failed pass ${pass + 1}. Sleeping ${PASS_DELAY_MS}ms before retrying transient failures.`,
      )
      await sleep(PASS_DELAY_MS)
    }
  }

  const failures = Array.from(failuresByModel.entries()).map(([model, msg]) => `${model}: ${msg}`)
  throw new Error(`All Gemini fallback models failed. ${failures.join(" | ")}`)
}
