const SEARCH_PAGE_SIZE = 24
const SEARCH_OFFSETS = [0, 24, 48, 72, 96]

export type MuseumArtwork = {
  id: string
  imageUrl: string
  fullImageUrl?: string
  fallbackImageUrl?: string
  title: string
  artist: string
  year: string
  source: string
  dateDisplay: string | null
  placeOfOrigin: string | null
  artistDisplay: string | null
  styleTitle: string | null
  classificationTitle: string | null
  subjectTitles: string[]
  mediumDisplay: string | null
  dimensions: string | null
  creditLine: string | null
  mainReferenceNumber: string | null
  exhibitionHistory: string | null
  shortDescription: string | null
  description: string | null
  publicationHistory: string | null
  provenanceText: string | null
  artworkUrl: string
}

export type MuseumProvider = {
  name: string
  search: (keyword: string, recentArtworkIds: string[]) => Promise<MuseumArtwork[]>
}

export type MuseumSearchContext = {
  recentArtworkIds: string[]
  recentArtworkSignatures: string[]
}

type ArtInstituteArtwork = {
  id: number
  title: string
  artist_title: string | null
  artist_display: string | null
  image_id: string | null
  date_display: string | null
  place_of_origin: string | null
  style_title: string | null
  classification_title: string | null
  subject_titles: string[] | null
  medium_display: string | null
  dimensions: string | null
  credit_line: string | null
  main_reference_number: string | null
  exhibition_history: string | null
  short_description: string | null
  description: string | null
  publication_history: string | null
  provenance_text: string | null
  thumbnail?: {
    lqip?: string | null
  } | null
}

type ArtInstituteResponse = {
  data?: ArtInstituteArtwork[]
  pagination?: {
    total?: number
  }
}

type MetSearchResponse = {
  total?: number
  objectIDs?: number[]
}

type MetObject = {
  objectID: number
  accessionNumber?: string
  title?: string
  artistDisplayName?: string
  artistDisplayBio?: string
  artistDisplayRole?: string
  objectDate?: string
  medium?: string
  dimensions?: string
  creditLine?: string
  classification?: string
  objectName?: string
  culture?: string
  period?: string
  dynasty?: string
  country?: string
  region?: string
  city?: string
  tags?: Array<{ term?: string }>
  primaryImage?: string
  primaryImageSmall?: string
  objectURL?: string
  repository?: string
  isPublicDomain?: boolean
}

type ClevelandResponse = {
  data?: ClevelandArtwork[]
}

type ClevelandArtwork = {
  id: number
  accession_number?: string
  title?: string
  creation_date?: string
  culture?: string[]
  technique?: string
  type?: string
  department?: string
  collection?: string
  measurements?: string
  creditline?: string
  tombstone?: string
  wall_description?: string
  description?: string
  provenance?: Array<{
    description?: string
  }>
  exhibition_history?: string
  images?: {
    web?: {
      url?: string
    }
    print?: {
      url?: string
    }
  }
  url?: string
  creators?: Array<{
    description?: string
  }>
}

type RijksSearchResponse = {
  orderedItems?: Array<{
    id?: string
  }>
}

type LinkedArtLanguage = {
  id?: string
  type?: string
}

type LinkedArtText = {
  type?: string
  id?: string
  content?: string
  language?: LinkedArtLanguage[]
  classified_as?: LinkedArtClassified[]
  notation?: LinkedArtNotation[]
  part?: LinkedArtText[]
}

type LinkedArtNotation = {
  "@language"?: string
  "@value"?: string
}

type LinkedArtClassified = {
  id?: string
  type?: string
  _label?: string
  notation?: LinkedArtNotation[]
  classified_as?: LinkedArtClassified[]
}

type LinkedArtAgent = {
  id?: string
  type?: string
  notation?: LinkedArtNotation[]
}

type LinkedArtProduction = {
  type?: string
  timespan?: {
    identified_by?: LinkedArtText[]
    begin_of_the_begin?: string
    end_of_the_end?: string
  }
  part?: Array<{
    carried_out_by?: LinkedArtAgent[]
  }>
  carried_out_by?: LinkedArtAgent[]
  technique?: LinkedArtClassified[]
}

type LinkedArtObject = {
  id?: string
  type?: string
  identified_by?: LinkedArtText[]
  produced_by?: LinkedArtProduction
  referred_to_by?: LinkedArtText[]
  subject_of?: LinkedArtText[]
  made_of?: LinkedArtClassified[]
  shows?: LinkedArtClassified[]
  dimension?: Array<{
    type?: string
    value?: number
    unit?: LinkedArtClassified
    classified_as?: LinkedArtClassified[]
  }>
}

type VamSearchResponse = {
  records?: VamSearchRecord[]
}

type VamSearchRecord = {
  systemNumber?: string
  objectType?: string
  _primaryTitle?: string
  _primaryMaker?: {
    name?: string
  }
  _primaryDate?: string
  _primaryPlace?: string
  _primaryImageId?: string
  _images?: {
    _primary_thumbnail?: string
    _iiif_image_base_url?: string
  }
}

type VamDetailResponse = {
  record?: VamDetailRecord
}

type VamDetailRecord = {
  systemNumber?: string
  accessionNumber?: string
  objectType?: string
  titles?: Array<{
    title?: string
  }>
  summaryDescription?: string
  physicalDescription?: string
  briefDescription?: string
  materialsAndTechniques?: string
  creditLine?: string
  dimensionsNote?: string
  objectHistory?: string
  historicalContext?: string
  contentDescription?: string
  images?: string[]
  placesOfOrigin?: Array<{
    place?: {
      text?: string
    }
  }>
  productionDates?: Array<{
    date?: {
      text?: string
    }
  }>
  artistMakerPerson?: VamMaker[]
  artistMakerOrganisations?: VamMaker[]
  categories?: Array<{
    text?: string
  }>
  styles?: Array<{
    text?: string
  }>
}

type VamMaker = {
  name?: {
    text?: string
  }
  association?: {
    text?: string
  }
}

type SmkResponse = {
  items?: SmkArtwork[]
}

type SmkArtwork = {
  object_number?: string
  titles?: Array<{
    title?: string
  }>
  production?: Array<{
    creator?: string
    creator_forename?: string
    creator_surname?: string
  }>
  production_date?: Array<{
    period?: string
  }>
  techniques?: string[]
  materials?: string[]
  dimensions?: string
  credit_line?: string
  collection?: string
  object_names?: Array<{
    name?: string
  }>
  work_status?: string
  current_location_name?: string
  image_thumbnail?: string
  image_native?: string
  image_cropped?: string
  image_iiif_id?: string
  public_domain?: boolean
  inscriptions?: string[]
  documentation?: string
  description?: string
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function compactText(items: Array<string | number | string[] | null | undefined>, separator = ", "): string | null {
  const values = items
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => (typeof item === "number" ? String(item) : item?.trim()))
    .filter((item): item is string => Boolean(item))

  return values.length > 0 ? values.join(separator) : null
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[randomIndex]] = [next[randomIndex] as T, next[index] as T]
  }

  return next
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

function isRecent(artworkId: string, recentArtworkIds: string[]): boolean {
  return recentArtworkIds.includes(artworkId)
}

function normalizeArtworkSignaturePart(value: string | null | undefined): string {
  return normalizeSearchText(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
}

export function getArtworkSignature(artwork: MuseumArtwork): string {
  return `${normalizeArtworkSignaturePart(artwork.title)}|${normalizeArtworkSignaturePart(artwork.artist)}`
}

function hasRecentSignature(artwork: MuseumArtwork, recentArtworkSignatures: string[]): boolean {
  return recentArtworkSignatures.includes(getArtworkSignature(artwork))
}

function normalizeSearchText(value: string | number | boolean | null | undefined): string {
  return typeof value === "string" ? value.toLowerCase().trim() : ""
}

function textLength(value: string | null | undefined): number {
  return typeof value === "string" ? value.trim().length : 0
}

function isUnknownArtist(value: string | null | undefined): boolean {
  const normalized = normalizeSearchText(value)

  return !normalized || normalized.includes("unknown") || normalized.includes("anonymous") || normalized.includes("неизвест")
}

function hasWeakTitle(value: string): boolean {
  const normalized = normalizeSearchText(value)

  return (
    !normalized ||
    normalized === "untitled" ||
    normalized === "без названия" ||
    /^[a-z]{1,4}[-\s]?\d/i.test(value) ||
    /^[A-Z]{1,4}-\d/.test(value)
  )
}

function hasPoorTherapeuticFit(artwork: MuseumArtwork): boolean {
  const text = normalizeSearchText(
    [
      artwork.title,
      artwork.classificationTitle,
      artwork.mediumDisplay,
      artwork.shortDescription,
      artwork.description,
      artwork.subjectTitles.join(" "),
    ].join(" "),
  )
  const weakTerms = [
    "fragment",
    "fragments",
    "plaster cast",
    "cast",
    "mold",
    "model",
    "study cast",
    "sample",
    "specimen",
    "tile",
    "shard",
    "sherd",
    "potsherd",
    "stone fragment",
    "architectural fragment",
    "reproduction",
    "facsimile",
  ]

  return weakTerms.some((term) => text.includes(term))
}

function hasPreferredArtType(artwork: MuseumArtwork): boolean {
  const text = normalizeSearchText([artwork.classificationTitle, artwork.mediumDisplay, artwork.source].join(" "))
  const preferredTerms = [
    "painting",
    "drawing",
    "print",
    "photograph",
    "sculpture",
    "watercolor",
    "engraving",
    "etching",
    "lithograph",
    "woodcut",
    "album",
  ]

  return preferredTerms.some((term) => text.includes(term))
}

function getKeywordRelevanceScore(artwork: MuseumArtwork, searchKeywords: string[]): number {
  return searchKeywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword)

    if (!normalizedKeyword || normalizedKeyword.length < 3) {
      return score
    }

    if (normalizeSearchText(artwork.title).includes(normalizedKeyword)) {
      return score + 8
    }

    if (normalizeSearchText(artwork.subjectTitles.join(" ")).includes(normalizedKeyword)) {
      return score + 7
    }

    if (normalizeSearchText(artwork.shortDescription || "").includes(normalizedKeyword)) {
      return score + 5
    }

    if (normalizeSearchText(artwork.description || "").includes(normalizedKeyword)) {
      return score + 4
    }

    if (
      normalizeSearchText([artwork.classificationTitle, artwork.mediumDisplay].join(" ")).includes(
        normalizedKeyword,
      )
    ) {
      return score + 2
    }

    return score
  }, 0)
}

function hasStrongKeywordRelevance(artwork: MuseumArtwork, searchKeywords: string[]): boolean {
  return getKeywordRelevanceScore(artwork, searchKeywords) >= 5
}

function artworkQualityScore(artwork: MuseumArtwork, searchKeywords: string[]): number {
  let score = 0

  if (!hasWeakTitle(artwork.title)) {
    score += 3
  }

  if (!isUnknownArtist(artwork.artist)) {
    score += 2
  }

  if (textLength(artwork.shortDescription) >= 80) {
    score += 4
  }

  if (textLength(artwork.description) >= 80) {
    score += 4
  }

  if (artwork.subjectTitles.length > 0) {
    score += 2
  }

  if (artwork.dateDisplay || artwork.year) {
    score += 1
  }

  if (artwork.placeOfOrigin) {
    score += 1
  }

  if (hasPreferredArtType(artwork)) {
    score += 3
  }

  if (hasPoorTherapeuticFit(artwork)) {
    score -= 8
  }

  score += getKeywordRelevanceScore(artwork, searchKeywords)

  return score
}

function selectArtworkFromTopCandidates(
  candidates: MuseumArtwork[],
  searchKeywords: string[],
  recentArtworkSignatures: string[],
): MuseumArtwork | null {
  const seenSignatures = new Set<string>()
  const uniqueCandidates = candidates.filter((artwork) => {
    const signature = getArtworkSignature(artwork)

    if (seenSignatures.has(signature)) {
      return false
    }

    seenSignatures.add(signature)
    return true
  })
  const ranked = uniqueCandidates
    .filter((artwork) => !hasRecentSignature(artwork, recentArtworkSignatures))
    .map((artwork) => ({
      artwork,
      score: artworkQualityScore(artwork, searchKeywords),
      random: Math.random(),
    }))
    .sort((left, right) => right.score - left.score || right.random - left.random)
  const fallbackRanked = uniqueCandidates
    .map((artwork) => ({
      artwork,
      score: artworkQualityScore(artwork, searchKeywords),
      random: Math.random(),
    }))
    .sort((left, right) => right.score - left.score || right.random - left.random)
  const stronglyRelevantCandidates = ranked.filter((item) =>
    hasStrongKeywordRelevance(item.artwork, searchKeywords),
  )
  const topCandidates = stronglyRelevantCandidates
    .filter((item) => item.score >= 8)
    .slice(0, 10)

  if (topCandidates.length > 0) {
    return shuffleArray(topCandidates)[0]?.artwork || null
  }

  return stronglyRelevantCandidates[0]?.artwork || ranked[0]?.artwork || fallbackRanked[0]?.artwork || null
}

function getEnglishNotation(items: LinkedArtNotation[] | undefined): string | null {
  if (!Array.isArray(items)) {
    return null
  }

  return (
    items?.find((item) => item["@language"] === "en")?.["@value"] ||
    items?.find((item) => item["@value"])?.["@value"] ||
    null
  )
}

function getEnglishText(items: LinkedArtText[] | undefined): string | null {
  return (
    items?.find((item) => item.language?.some((language) => language.id?.includes("300388277")))?.content ||
    items?.find((item) => item.content)?.content ||
    null
  )
}

function getRijksObjectNumber(items: LinkedArtText[] | undefined): string | null {
  return (
    items?.find((item) =>
      item.classified_as?.some((classification) =>
        classification.notation?.some((notation) => notation["@value"] === "object number"),
      ),
    )?.content ||
    items?.find((item) => item.type === "Identifier" && /^[A-Z]{1,4}-/.test(item.content || ""))?.content ||
    null
  )
}

function getRijksDescription(items: LinkedArtText[] | undefined): string | null {
  const directDescription = items?.find(
    (item) =>
      item.content &&
      item.language?.some((language) => language.id?.includes("300388277")) &&
      item.content.length > 80,
  )?.content

  if (directDescription) {
    return directDescription
  }

  for (const item of items || []) {
    const nestedDescription = item.part?.find((part) => part.content && part.content.length > 80)?.content

    if (nestedDescription) {
      return nestedDescription
    }
  }

  return null
}

function getRijksArtist(production: LinkedArtProduction | undefined): string | null {
  const directArtist = production?.carried_out_by?.map((artist) => getEnglishNotation(artist.notation)).find(Boolean)
  const partArtist = production?.part
    ?.flatMap((part) => part.carried_out_by || [])
    .map((artist) => getEnglishNotation(artist.notation))
    .find(Boolean)

  return directArtist || partArtist || null
}

function getRijksDimensions(dimensions: LinkedArtObject["dimension"]): string | null {
  if (!dimensions || dimensions.length === 0) {
    return null
  }

  return compactText(
    dimensions.map((dimension) => {
      const label = getEnglishNotation(dimension.classified_as?.[0]?.notation)
      const unit = getEnglishNotation(dimension.unit?.notation)

      if (!dimension.value) {
        return null
      }

      return compactText([label, `${dimension.value}${unit ? ` ${unit}` : ""}`], ": ")
    }),
  )
}

function findRijksAccessPoint(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRijksAccessPoint(item)

      if (found) {
        return found
      }
    }

    return null
  }

  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const accessPoint = record.access_point

  if (Array.isArray(accessPoint)) {
    for (const point of accessPoint) {
      if (point && typeof point === "object") {
        const id = (point as Record<string, unknown>).id

        if (typeof id === "string" && id.includes("rijksmuseum.nl")) {
          return id
        }
      }
    }
  }

  for (const child of Object.values(record)) {
    const found = findRijksAccessPoint(child)

    if (found) {
      return found
    }
  }

  return null
}

async function fetchRijksImageUrl(artworkUrl: string): Promise<string | null> {
  const response = await fetch(artworkUrl, { cache: "no-store" })

  if (!response.ok) {
    return null
  }

  const html = await response.text()
  const match = html.match(/property="og:image" content="([^"]+)"/)

  return match?.[1] || null
}

function buildVamImageUrl(imageId: string, size = "!800,800"): string {
  return `https://framemark.vam.ac.uk/collections/${imageId}/full/${size}/0/default.jpg`
}

function buildSmkArtworkUrl(objectNumber: string): string {
  return `https://open.smk.dk/en/artwork/image/${encodeURIComponent(objectNumber)}`
}

async function searchArtInstitute(keyword: string, recentArtworkIds: string[]): Promise<MuseumArtwork[]> {
  const fields = [
    "id",
    "title",
    "artist_title",
    "artist_display",
    "image_id",
    "date_display",
    "place_of_origin",
    "style_title",
    "classification_title",
    "subject_titles",
    "medium_display",
    "dimensions",
    "credit_line",
    "main_reference_number",
    "exhibition_history",
    "short_description",
    "description",
    "publication_history",
    "provenance_text",
    "thumbnail",
  ].join(",")

  const requestArtworkBatch = async (offset: number): Promise<ArtInstituteArtwork[]> => {
    const artUrl =
      `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(keyword)}` +
      `&fields=${fields}&limit=${SEARCH_PAGE_SIZE}&from=${offset}`

    const artResponse = await fetch(artUrl, {
      cache: "no-store",
    })

    if (!artResponse.ok) {
      throw new Error(`Art Institute request failed: ${await readErrorBody(artResponse)}`)
    }

    const artData = (await artResponse.json()) as ArtInstituteResponse
    const total = artData.pagination?.total ?? 0

    if (total > SEARCH_PAGE_SIZE) {
      const maxOffset = Math.max(0, total - SEARCH_PAGE_SIZE)
      const boundedOffset = Math.min(offset, maxOffset)

      if (boundedOffset !== offset) {
        return requestArtworkBatch(boundedOffset)
      }
    }

    return Array.isArray(artData.data) ? artData.data : []
  }

  const batches = await Promise.all(shuffleArray(SEARCH_OFFSETS).map((offset) => requestArtworkBatch(offset)))
  const uniqueArtworks = new Map<number, ArtInstituteArtwork>()

  for (const artwork of batches.flat()) {
    if (!artwork.image_id || isRecent(`artic:${artwork.id}`, recentArtworkIds)) {
      continue
    }

    uniqueArtworks.set(artwork.id, artwork)
  }

  return shuffleArray(Array.from(uniqueArtworks.values()))
    .slice(0, 8)
    .map((artwork) => ({
      id: `artic:${artwork.id}`,
      imageUrl: `/api/art-image/${artwork.image_id}`,
      fullImageUrl: `/api/art-image/${artwork.image_id}?size=full`,
      fallbackImageUrl: artwork.thumbnail?.lqip || "",
      title: artwork.title,
      artist: artwork.artist_title || "Неизвестный автор",
      year: artwork.date_display || "",
      source: "Art Institute of Chicago API",
      dateDisplay: artwork.date_display,
      placeOfOrigin: artwork.place_of_origin,
      artistDisplay: stripHtml(artwork.artist_display),
      styleTitle: artwork.style_title,
      classificationTitle: artwork.classification_title,
      subjectTitles: Array.isArray(artwork.subject_titles) ? artwork.subject_titles : [],
      mediumDisplay: artwork.medium_display,
      dimensions: artwork.dimensions,
      creditLine: artwork.credit_line,
      mainReferenceNumber: artwork.main_reference_number,
      exhibitionHistory: stripHtml(artwork.exhibition_history),
      shortDescription: stripHtml(artwork.short_description),
      description: stripHtml(artwork.description),
      publicationHistory: stripHtml(artwork.publication_history),
      provenanceText: stripHtml(artwork.provenance_text),
      artworkUrl: `https://www.artic.edu/artworks/${artwork.id}`,
    }))
}

async function searchMet(keyword: string, recentArtworkIds: string[]): Promise<MuseumArtwork[]> {
  const searchResponse = await fetch(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(keyword)}`,
    { cache: "no-store" },
  )

  if (!searchResponse.ok) {
    throw new Error(`Met Museum request failed: ${await readErrorBody(searchResponse)}`)
  }

  const searchData = (await searchResponse.json()) as MetSearchResponse
  const objectIds = shuffleArray(searchData.objectIDs || [])
    .filter((objectId) => !isRecent(`met:${objectId}`, recentArtworkIds))
    .slice(0, 16)

  const artworks = await Promise.all(
    objectIds.map(async (objectId) => {
      const detailResponse = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`,
        { cache: "no-store" },
      )

      if (!detailResponse.ok) {
        return null
      }

      return (await detailResponse.json()) as MetObject
    }),
  )

  return artworks
    .filter((artwork): artwork is MetObject => Boolean(artwork?.primaryImageSmall || artwork?.primaryImage))
    .slice(0, 8)
    .map((artwork) => {
      const artist = artwork.artistDisplayName || artwork.culture || "Неизвестный автор"
      const placeOfOrigin = compactText([artwork.city, artwork.region, artwork.country])

      return {
        id: `met:${artwork.objectID}`,
        imageUrl: artwork.primaryImageSmall || artwork.primaryImage || "",
        fullImageUrl: artwork.primaryImage || artwork.primaryImageSmall || "",
        fallbackImageUrl: artwork.primaryImage || "",
        title: artwork.title || "Без названия",
        artist,
        year: artwork.objectDate || "",
        source: "Metropolitan Museum of Art API",
        dateDisplay: artwork.objectDate || null,
        placeOfOrigin,
        artistDisplay: compactText([artwork.artistDisplayRole, artwork.artistDisplayName, artwork.artistDisplayBio]),
        styleTitle: artwork.period || artwork.dynasty || null,
        classificationTitle: artwork.classification || artwork.objectName || null,
        subjectTitles: artwork.tags?.map((tag) => tag.term).filter((tag): tag is string => Boolean(tag)) || [],
        mediumDisplay: artwork.medium || null,
        dimensions: artwork.dimensions || null,
        creditLine: artwork.creditLine || null,
        mainReferenceNumber: artwork.accessionNumber || null,
        exhibitionHistory: null,
        shortDescription: artwork.repository || null,
        description: compactText([artwork.title, artwork.objectName, artwork.medium], ". "),
        publicationHistory: null,
        provenanceText: null,
        artworkUrl:
          artwork.objectURL || `https://www.metmuseum.org/art/collection/search/${artwork.objectID}`,
      }
    })
}

async function searchCleveland(keyword: string, recentArtworkIds: string[]): Promise<MuseumArtwork[]> {
  const response = await fetch(
    `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(keyword)}&has_image=1&limit=20`,
    { cache: "no-store" },
  )

  if (!response.ok) {
    throw new Error(`Cleveland Museum request failed: ${await readErrorBody(response)}`)
  }

  const data = (await response.json()) as ClevelandResponse

  return shuffleArray(data.data || [])
    .filter((artwork) => {
      const imageUrl = artwork.images?.web?.url || artwork.images?.print?.url

      return Boolean(imageUrl && !isRecent(`cleveland:${artwork.id}`, recentArtworkIds))
    })
    .slice(0, 8)
    .map((artwork) => ({
      id: `cleveland:${artwork.id}`,
      imageUrl: artwork.images?.web?.url || artwork.images?.print?.url || "",
      fullImageUrl: artwork.images?.print?.url || artwork.images?.web?.url || "",
      fallbackImageUrl: artwork.images?.print?.url || "",
      title: artwork.title || "Без названия",
      artist: artwork.creators?.[0]?.description || "Неизвестный автор",
      year: artwork.creation_date || "",
      source: "Cleveland Museum of Art Open Access API",
      dateDisplay: artwork.creation_date || null,
      placeOfOrigin: compactText(artwork.culture || []),
      artistDisplay: compactText(artwork.creators?.map((creator) => creator.description) || []),
      styleTitle: artwork.collection || artwork.department || null,
      classificationTitle: artwork.type || null,
      subjectTitles: [],
      mediumDisplay: artwork.technique || null,
      dimensions: artwork.measurements || null,
      creditLine: artwork.creditline || null,
      mainReferenceNumber: artwork.accession_number || null,
      exhibitionHistory: artwork.exhibition_history || null,
      shortDescription: stripHtml(artwork.wall_description),
      description: stripHtml(artwork.description) || artwork.tombstone || null,
      publicationHistory: null,
      provenanceText: compactText(artwork.provenance?.map((item) => stripHtml(item.description)) || [], "\n"),
      artworkUrl: artwork.url || `https://clevelandart.org/art/${artwork.accession_number}`,
    }))
}

async function searchRijksmuseum(keyword: string, recentArtworkIds: string[]): Promise<MuseumArtwork[]> {
  const searchByDescription = await fetch(
    `https://data.rijksmuseum.nl/search/collection?description=${encodeURIComponent(keyword)}&imageAvailable=true`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  )

  if (!searchByDescription.ok) {
    throw new Error(`Rijksmuseum request failed: ${await readErrorBody(searchByDescription)}`)
  }

  const searchData = (await searchByDescription.json()) as RijksSearchResponse
  const objectIds = shuffleArray(
    (searchData.orderedItems || [])
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id && !isRecent(`rijks:${id}`, recentArtworkIds))),
  ).slice(0, 8)

  const artworks: MuseumArtwork[] = []

  for (const objectId of objectIds) {
    const detailResponse = await fetch(objectId, {
      headers: { Accept: "application/ld+json" },
      cache: "no-store",
    })

    if (!detailResponse.ok) {
      continue
    }

    const artwork = (await detailResponse.json()) as LinkedArtObject
    const artworkUrl = findRijksAccessPoint(artwork)

    if (!artworkUrl) {
      continue
    }

    const imageUrl = await fetchRijksImageUrl(artworkUrl)

    if (!imageUrl) {
      continue
    }

    const objectNumber = getRijksObjectNumber(artwork.identified_by)
    const title = getEnglishText(artwork.identified_by) || "Без названия"
    const artist = getRijksArtist(artwork.produced_by) || "Неизвестный автор"
    const dateDisplay = getEnglishText(artwork.produced_by?.timespan?.identified_by)
    const mediumDisplay = compactText([
      compactText(artwork.produced_by?.technique?.map((item) => getEnglishNotation(item.notation)) || []),
      compactText(artwork.made_of?.map((item) => getEnglishNotation(item.notation)) || []),
    ])

    artworks.push({
      id: `rijks:${objectId}`,
      imageUrl,
      fullImageUrl: imageUrl,
      fallbackImageUrl: "",
      title,
      artist,
      year: dateDisplay || "",
      source: "Rijksmuseum Data Services",
      dateDisplay,
      placeOfOrigin: null,
      artistDisplay: artist,
      styleTitle: null,
      classificationTitle: null,
      subjectTitles: artwork.shows?.map((item) => getEnglishNotation(item.notation)).filter((item): item is string => Boolean(item)) || [],
      mediumDisplay,
      dimensions: getRijksDimensions(artwork.dimension),
      creditLine: null,
      mainReferenceNumber: objectNumber,
      exhibitionHistory: null,
      shortDescription: getRijksDescription(artwork.referred_to_by),
      description: getRijksDescription(artwork.referred_to_by),
      publicationHistory: null,
      provenanceText: null,
      artworkUrl,
    })

    if (artworks.length >= 6) {
      break
    }
  }

  return artworks
}

async function searchVam(keyword: string, recentArtworkIds: string[]): Promise<MuseumArtwork[]> {
  const response = await fetch(
    `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(keyword)}&images_exist=1&page_size=12`,
    { cache: "no-store" },
  )

  if (!response.ok) {
    throw new Error(`V&A request failed: ${await readErrorBody(response)}`)
  }

  const data = (await response.json()) as VamSearchResponse
  const records = shuffleArray(data.records || [])
    .filter((record) => record.systemNumber && !isRecent(`vam:${record.systemNumber}`, recentArtworkIds))
    .slice(0, 8)

  const details = await Promise.all(
    records.map(async (record) => {
      if (!record.systemNumber) {
        return null
      }

      const detailResponse = await fetch(`https://api.vam.ac.uk/v2/object/${record.systemNumber}`, {
        cache: "no-store",
      })

      if (!detailResponse.ok) {
        return null
      }

      const detail = (await detailResponse.json()) as VamDetailResponse

      return {
        search: record,
        detail: detail.record,
      }
    }),
  )

  return details
    .filter((item): item is { search: VamSearchRecord; detail: VamDetailRecord } =>
      Boolean(item?.detail && (item.detail.images?.[0] || item.search._primaryImageId)),
    )
    .slice(0, 8)
    .map(({ search, detail }) => {
      const imageId = detail.images?.[0] || search._primaryImageId || ""
      const makers = [...(detail.artistMakerPerson || []), ...(detail.artistMakerOrganisations || [])]
      const artist = compactText(makers.map((maker) => maker.name?.text)) || search._primaryMaker?.name || "Неизвестный автор"
      const title = detail.titles?.[0]?.title || search._primaryTitle || detail.objectType || "Без названия"
      const dateDisplay = detail.productionDates?.[0]?.date?.text || search._primaryDate || ""

      return {
        id: `vam:${detail.systemNumber || search.systemNumber}`,
        imageUrl: buildVamImageUrl(imageId),
        fullImageUrl: buildVamImageUrl(imageId, "full"),
        fallbackImageUrl: search._images?._primary_thumbnail || "",
        title,
        artist,
        year: dateDisplay,
        source: "Victoria and Albert Museum Collections API",
        dateDisplay: dateDisplay || null,
        placeOfOrigin: detail.placesOfOrigin?.[0]?.place?.text || search._primaryPlace || null,
        artistDisplay: artist,
        styleTitle: compactText(detail.styles?.map((style) => style.text) || []),
        classificationTitle: detail.objectType || search.objectType || null,
        subjectTitles: detail.categories?.map((category) => category.text).filter((category): category is string => Boolean(category)) || [],
        mediumDisplay: detail.materialsAndTechniques || null,
        dimensions: detail.dimensionsNote || null,
        creditLine: detail.creditLine || null,
        mainReferenceNumber: detail.accessionNumber || null,
        exhibitionHistory: null,
        shortDescription: detail.briefDescription || detail.summaryDescription || null,
        description: detail.contentDescription || detail.physicalDescription || detail.historicalContext || null,
        publicationHistory: null,
        provenanceText: detail.objectHistory || null,
        artworkUrl: `https://collections.vam.ac.uk/item/${detail.systemNumber || search.systemNumber}`,
      }
    })
}

async function searchSmk(keyword: string, recentArtworkIds: string[]): Promise<MuseumArtwork[]> {
  const response = await fetch(
    `https://api.smk.dk/api/v1/art/search/?keys=${encodeURIComponent(keyword)}&image=true&rows=20&lang=en`,
    { cache: "no-store" },
  )

  if (!response.ok) {
    throw new Error(`SMK request failed: ${await readErrorBody(response)}`)
  }

  const data = (await response.json()) as SmkResponse

  return shuffleArray(data.items || [])
    .filter((artwork) => {
      const objectNumber = artwork.object_number
      const imageUrl = artwork.image_thumbnail || artwork.image_cropped || artwork.image_native

      return Boolean(objectNumber && imageUrl && !isRecent(`smk:${objectNumber}`, recentArtworkIds))
    })
    .slice(0, 8)
    .map((artwork) => {
      const objectNumber = artwork.object_number || ""
      const artist =
        artwork.production?.[0]?.creator ||
        compactText([artwork.production?.[0]?.creator_forename, artwork.production?.[0]?.creator_surname]) ||
        "Неизвестный автор"
      const mediumDisplay = compactText([
        compactText(artwork.materials || []),
        compactText(artwork.techniques || []),
      ])

      return {
        id: `smk:${objectNumber}`,
        imageUrl: artwork.image_thumbnail || artwork.image_cropped || artwork.image_native || "",
        fullImageUrl: artwork.image_native || artwork.image_cropped || artwork.image_thumbnail || "",
        fallbackImageUrl: artwork.image_native || artwork.image_cropped || "",
        title: artwork.titles?.[0]?.title || "Без названия",
        artist,
        year: artwork.production_date?.[0]?.period || "",
        source: "SMK Open API",
        dateDisplay: artwork.production_date?.[0]?.period || null,
        placeOfOrigin: null,
        artistDisplay: artist,
        styleTitle: artwork.collection || null,
        classificationTitle: compactText(artwork.object_names?.map((item) => item.name) || []),
        subjectTitles:
          artwork.object_names?.map((item) => item.name).filter((item): item is string => Boolean(item)) || [],
        mediumDisplay,
        dimensions: artwork.dimensions || null,
        creditLine: artwork.credit_line || null,
        mainReferenceNumber: objectNumber,
        exhibitionHistory: null,
        shortDescription: artwork.description || null,
        description: artwork.documentation || artwork.description || null,
        publicationHistory: null,
        provenanceText: compactText([artwork.work_status, artwork.current_location_name]),
        artworkUrl: buildSmkArtworkUrl(objectNumber),
      }
    })
}

export const MUSEUM_PROVIDERS: MuseumProvider[] = [
  {
    name: "Art Institute of Chicago",
    search: searchArtInstitute,
  },
  {
    name: "Metropolitan Museum of Art",
    search: searchMet,
  },
  {
    name: "Cleveland Museum of Art",
    search: searchCleveland,
  },
  {
    name: "Rijksmuseum",
    search: searchRijksmuseum,
  },
  {
    name: "Victoria and Albert Museum",
    search: searchVam,
  },
  {
    name: "SMK",
    search: searchSmk,
  },
]

export async function fetchArtworkFromMuseums(
  searchKeywords: string[],
  searchContext: MuseumSearchContext,
): Promise<MuseumArtwork> {
  const keywords = Array.from(new Set([...searchKeywords, "still life", "landscape", "interior", "nature", "portrait"]))
  const providerResults = await Promise.all(
    keywords.slice(0, 6).flatMap((keyword) =>
      shuffleArray(MUSEUM_PROVIDERS).map(async (provider) => {
        try {
          return await provider.search(keyword, searchContext.recentArtworkIds)
        } catch (error) {
          console.warn(`${provider.name} search failed:`, error)
          return []
        }
      }),
    ),
  )
  const pooledArtwork = providerResults.flat()
  const pooledSelection = selectArtworkFromTopCandidates(
    pooledArtwork,
    searchKeywords,
    searchContext.recentArtworkSignatures,
  )

  if (pooledSelection) {
    return pooledSelection
  }

  for (const keyword of shuffleArray(keywords)) {
    const providerResults = await Promise.all(
      shuffleArray(MUSEUM_PROVIDERS).map(async (provider) => {
        try {
          return await provider.search(keyword, searchContext.recentArtworkIds)
        } catch (error) {
          console.warn(`${provider.name} search failed:`, error)
          return []
        }
      }),
    )
    const candidates = providerResults.flat()
    const bestArtwork = selectArtworkFromTopCandidates(
      candidates,
      searchKeywords,
      searchContext.recentArtworkSignatures,
    )

    if (bestArtwork) {
      return bestArtwork
    }
  }

  throw new Error("No artwork with image was found in the museum APIs")
}
