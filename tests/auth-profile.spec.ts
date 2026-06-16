import { expect, test } from "@playwright/test"

const REGISTER_SUBMIT = /создать аккаунт/i

test.describe("auth: password input and validation", () => {
  test("should toggle password visibility on register page", async ({ page }) => {
    await page.goto("/register")

    const passwordField = page.locator("#password")
    await expect(passwordField).toBeVisible()
    await passwordField.fill("secret123")
    await expect(passwordField).toHaveAttribute("type", "password")

    const fieldContainer = passwordField.locator("..")
    await fieldContainer
      .getByRole("button", { name: /показать пароль/i })
      .click()
    await expect(passwordField).toHaveAttribute("type", "text")

    await fieldContainer
      .getByRole("button", { name: /скрыть пароль/i })
      .click()
    await expect(passwordField).toHaveAttribute("type", "password")
  })

  test("should toggle password visibility on login page", async ({ page }) => {
    await page.goto("/login")

    const passwordField = page.locator("#password")
    await expect(passwordField).toBeVisible()
    await passwordField.fill("secret123")
    await expect(passwordField).toHaveAttribute("type", "password")

    const fieldContainer = passwordField.locator("..")
    await fieldContainer
      .getByRole("button", { name: /показать пароль/i })
      .click()
    await expect(passwordField).toHaveAttribute("type", "text")
  })

  test("should disable submit and show error when register passwords mismatch", async ({
    page,
  }) => {
    await page.goto("/register")

    await page.locator("#email").fill("not-needed@example.com")
    await page.locator("#password").fill("secret123")
    await page.locator("#password_confirmation").fill("different999")
    await page.locator("#password_confirmation").blur()

    await expect(page.getByText(/пароли не совпадают/i)).toBeVisible()
    await expect(page.getByRole("button", { name: REGISTER_SUBMIT })).toBeDisabled()
  })

  test("should enable submit when register passwords match", async ({ page }) => {
    await page.goto("/register")

    await page.locator("#email").fill("not-needed@example.com")
    await page.locator("#password").fill("secret123")
    await page.locator("#password_confirmation").fill("secret123")

    await expect(page.getByRole("button", { name: REGISTER_SUBMIT })).toBeEnabled()
  })

  test("should keep submit disabled when password is too short", async ({ page }) => {
    await page.goto("/register")

    await page.locator("#email").fill("not-needed@example.com")
    await page.locator("#password").fill("abc")
    await page.locator("#password_confirmation").fill("abc")

    await expect(page.getByRole("button", { name: REGISTER_SUBMIT })).toBeDisabled()
  })
})
