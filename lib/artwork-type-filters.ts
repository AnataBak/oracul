export type ArtworkTypeFilter =
  | "painting"
  | "drawing"
  | "print"
  | "photograph"
  | "sculpture"
  | "textile"
  | "ceramic"
  | "decorative"
  | "furniture"
  | "manuscript"

export type ArtworkTypeFilterOption = {
  id: ArtworkTypeFilter
  label: string
  description: string
}

export const ARTWORK_TYPE_FILTER_OPTIONS: ArtworkTypeFilterOption[] = [
  {
    id: "painting",
    label: "Картины",
    description: "живопись, масляные и акриловые работы, панно",
  },
  {
    id: "drawing",
    label: "Рисунки",
    description: "рисунок, акварель, пастель, наброски на бумаге",
  },
  {
    id: "print",
    label: "Гравюры и эстампы",
    description: "гравюра, литография, офорт, ксилография, принты",
  },
  {
    id: "photograph",
    label: "Фотографии",
    description: "музейные фото, фотоработы, фотопечать",
  },
  {
    id: "sculpture",
    label: "Скульптура",
    description: "объёмные работы, статуи, рельефы, бюсты",
  },
  {
    id: "textile",
    label: "Текстиль",
    description: "ткань, вышивка, гобелен, костюм, одежда",
  },
  {
    id: "ceramic",
    label: "Керамика и фарфор",
    description: "вазы, керамика, фарфор, сосуды, глина",
  },
  {
    id: "decorative",
    label: "Декоративные предметы",
    description: "ювелирные, металлические, стеклянные и прочие предметы",
  },
  {
    id: "furniture",
    label: "Мебель и интерьерные объекты",
    description: "столы, шкафы, кресла, интерьерные предметы",
  },
  {
    id: "manuscript",
    label: "Рукописи, книги и плакаты",
    description: "книжные листы, манускрипты, плакаты, афиши",
  },
]

export const DEFAULT_ARTWORK_TYPE_FILTERS: ArtworkTypeFilter[] = ARTWORK_TYPE_FILTER_OPTIONS.map(
  (option) => option.id,
)

export function isArtworkTypeFilter(value: unknown): value is ArtworkTypeFilter {
  return ARTWORK_TYPE_FILTER_OPTIONS.some((option) => option.id === value)
}

export function sanitizeArtworkTypeFilters(value: unknown): ArtworkTypeFilter[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ARTWORK_TYPE_FILTERS
  }

  const selected = Array.from(
    new Set(value.filter((item): item is ArtworkTypeFilter => isArtworkTypeFilter(item))),
  )

  return selected.length > 0 ? selected : DEFAULT_ARTWORK_TYPE_FILTERS
}

export function areAllArtworkTypeFiltersSelected(filters: ArtworkTypeFilter[]): boolean {
  return DEFAULT_ARTWORK_TYPE_FILTERS.every((filterId) => filters.includes(filterId))
}
