export type ArtworkSearchIntent = {
  primaryTerms: string[]
  secondaryTerms: string[]
  sceneTerms: string[]
  moodTerms: string[]
  searchTerms: string[]
}

export const EMPTY_ARTWORK_SEARCH_INTENT: ArtworkSearchIntent = {
  primaryTerms: [],
  secondaryTerms: [],
  sceneTerms: [],
  moodTerms: [],
  searchTerms: [],
}
