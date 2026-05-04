export type OracleVoice = "therapist" | "artHistorian" | "poet" | "oracle"

export type OracleVoiceOption = {
  id: OracleVoice
  icon: string
  label: string
  description: string
}

export const DEFAULT_ORACLE_VOICE: OracleVoice = "therapist"

export const ORACLE_VOICE_OPTIONS: OracleVoiceOption[] = [
  {
    id: "therapist",
    icon: "🌿",
    label: "Арт‑терапевт",
    description: "мягко поддержит и поможет прислушаться к себе",
  },
  {
    id: "artHistorian",
    icon: "🎨",
    label: "Искусствовед",
    description: "объяснит контекст, материал и музейные детали",
  },
  {
    id: "poet",
    icon: "📜",
    label: "Поэт",
    description: "ответит короткой атмосферной строфой",
  },
  {
    id: "oracle",
    icon: "🔮",
    label: "Оракул",
    description: "прочитает картину как метафорический знак",
  },
]

export function isOracleVoice(value: unknown): value is OracleVoice {
  return (
    value === "therapist" ||
    value === "artHistorian" ||
    value === "poet" ||
    value === "oracle"
  )
}

export function getOracleVoiceOption(voice: OracleVoice): OracleVoiceOption {
  return ORACLE_VOICE_OPTIONS.find((option) => option.id === voice) || ORACLE_VOICE_OPTIONS[0]
}
