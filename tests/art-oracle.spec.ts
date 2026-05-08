import { expect, test, type Page, type Route } from "@playwright/test"

const MOCK_ARTWORK_IMAGE_PATH = "/mock-artwork.svg"

const mockMuseumInfo = {
  source: "Тестовый музей",
  artworkId: "mock-artwork-1",
  artworkSignature: "test-museum:mock-artwork-1",
  dateDisplay: "1901",
  placeOfOrigin: "Тестовый город",
  artistDisplay: "Тестовый художник",
  styleTitle: "Тестовый стиль",
  classificationTitle: "Картина",
  subjectTitles: ["спокойствие", "меланхолия"],
  mediumDisplay: "Холст, масло",
  dimensions: "40 × 50 см",
  creditLine: "Тестовая коллекция",
  shortDescription: "Короткое описание тестовой картины.",
  description: "Описание тестовой картины для автопроверки.",
  artworkUrl: "https://example.com/artwork",
}

const mockArtResponse = {
  imageUrl: MOCK_ARTWORK_IMAGE_PATH,
  fullImageUrl: MOCK_ARTWORK_IMAGE_PATH,
  title: "Тестовая картина",
  artist: "Тестовый художник",
  year: "1901",
  therapistText: "Тестовое послание оракула спокойно отвечает на настроение.",
  searchKeywords: ["calm", "melancholy"],
  visualAnalysisRequested: true,
  visualAnalysisUsed: false,
  geminiTextModel: "mock-gemini-model",
  museumInfo: mockMuseumInfo,
}

const mockDailyArtResponse = {
  date: "2026-05-08",
  title: "Тестовая картина дня",
  artist: "Художник дня",
  year: "1888",
  imageUrl: MOCK_ARTWORK_IMAGE_PATH,
  fullImageUrl: MOCK_ARTWORK_IMAGE_PATH,
  artworkUrl: "https://example.com/daily-artwork",
  source: "Тестовый музей",
  museumInfo: {
    ...mockMuseumInfo,
    artworkId: "mock-daily-artwork-1",
    artworkSignature: "test-museum:mock-daily-artwork-1",
    artworkUrl: "https://example.com/daily-artwork",
  },
}

const mockRandomArtResponse = {
  artworks: [
    {
      id: "mock-random-artwork-1",
      signature: "test-museum:mock-random-artwork-1",
      imageUrl: MOCK_ARTWORK_IMAGE_PATH,
      title: "Случайная тестовая картина",
      artist: "Случайный художник",
      year: "1910",
    },
  ],
}

async function openHomePage(page: Page) {
  await page.goto("/")
  await page.locator(".opacity-100").first().waitFor()
}

async function fillMood(page: Page, mood: string) {
  await page.getByPlaceholder("Сегодня я чувствую себя...").fill(mood)
  await expect(page.getByText(`${mood.length} символов`)).toBeVisible()
}

async function mockStableAppEndpoints(page: Page) {
  await page.route(`**${MOCK_ARTWORK_IMAGE_PATH}`, async (route) => {
    await route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#efe7d7"/><circle cx="400" cy="300" r="140" fill="#8d6b4f"/><text x="400" y="315" text-anchor="middle" font-size="42" fill="#fff">Art</text></svg>`,
    })
  })

  await page.route("**/api/daily-art", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(mockDailyArtResponse),
    })
  })

  await page.route("**/api/random-art", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(mockRandomArtResponse),
    })
  })
}

test.beforeEach(async ({ page }) => {
  await mockStableAppEndpoints(page)
})

test("opens the home page with the main input", async ({ page }) => {
  await openHomePage(page)

  await expect(page.getByRole("heading", { name: "Арт-Оракул" })).toBeVisible()
  await expect(page.getByPlaceholder("Сегодня я чувствую себя...")).toBeVisible()
  await expect(page.getByRole("button", { name: /Найти картину/ })).toBeDisabled()
})

test("submits a mood and shows an oracle result", async ({ page }) => {
  let resolveArt!: () => void
  const artGate = new Promise<void>((resolve) => {
    resolveArt = resolve
  })

  await page.route("**/api/art", async (route: Route) => {
    const requestBody = route.request().postDataJSON() as { userText?: string }

    expect(requestBody.userText).toContain("спокойно")

    await artGate

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(mockArtResponse),
    })
  })

  await openHomePage(page)
  await fillMood(page, "Мне спокойно, но немного грустно")
  await expect(page.getByRole("button", { name: /Найти картину/ })).toBeEnabled()
  await page.getByRole("button", { name: /Найти картину/ }).click()

  await expect(page.getByRole("heading", { name: "Загрузка" })).toBeVisible()

  resolveArt()

  await expect(page.getByText("Тестовая картина", { exact: true })).toBeVisible()
  await expect(page.getByText("Тестовое послание оракула")).toBeVisible()
})

test("shows a friendly message when the oracle request fails", async ({ page }) => {
  await page.route("**/api/art", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Тестовая ошибка сервера" }),
    })
  })

  await openHomePage(page)
  await fillMood(page, "Мне тревожно")
  await expect(page.getByRole("button", { name: /Найти картину/ })).toBeEnabled()
  await page.getByRole("button", { name: /Найти картину/ }).click()

  await expect(page.getByText("Не удалось подобрать картину")).toBeVisible()
  await expect(page.getByText("Тестовая ошибка сервера")).toBeVisible()
  await expect(page.getByPlaceholder("Сегодня я чувствую себя...")).toBeVisible()
})
