export type ArtworkSelectionStrictness = "standard" | "soft" | "precise" | "literal"

export type ArtworkSelectionStrictnessOption = {
  id: ArtworkSelectionStrictness
  icon: string
  label: string
  description: string
}

export const DEFAULT_ARTWORK_SELECTION_STRICTNESS: ArtworkSelectionStrictness = "standard"

export const ARTWORK_SELECTION_STRICTNESS_OPTIONS: ArtworkSelectionStrictnessOption[] = [
  {
    id: "standard",
    icon: "⚖️",
    label: "Стандартно",
    description: "текущий баланс смысла, качества и разнообразия",
  },
  {
    id: "soft",
    icon: "🌫️",
    label: "Мягко",
    description: "больше настроения и атмосферы, меньше буквальности",
  },
  {
    id: "precise",
    icon: "🎯",
    label: "Точнее",
    description: "строже совпадает с темами, названием и описанием",
  },
  {
    id: "literal",
    icon: "🔎",
    label: "Буквально",
    description: "ищет предметы и сцены максимально близко к тексту",
  },
]

export function isArtworkSelectionStrictness(value: unknown): value is ArtworkSelectionStrictness {
  return value === "standard" || value === "soft" || value === "precise" || value === "literal"
}

export function getArtworkSelectionStrictnessOption(
  strictness: ArtworkSelectionStrictness,
): ArtworkSelectionStrictnessOption {
  return (
    ARTWORK_SELECTION_STRICTNESS_OPTIONS.find((option) => option.id === strictness) ||
    ARTWORK_SELECTION_STRICTNESS_OPTIONS[0]
  )
}
