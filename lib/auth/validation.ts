export const PASSWORD_MIN_LENGTH = 6
export const DISPLAY_NAME_MIN_LENGTH = 2
export const DISPLAY_NAME_MAX_LENGTH = 32

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DISPLAY_NAME_REGEX = /^[\p{L}\p{N}_.-]+$/u

export function validateEmail(email: string): string | null {
  if (!email) return "Введите email."
  if (!EMAIL_REGEX.test(email)) return "Похоже, в email есть опечатка."
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return "Введите пароль."
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов.`
  }
  return null
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) return "Повторите пароль."
  if (password !== confirmation) return "Пароли не совпадают."
  return null
}

export function validateDisplayName(name: string): string | null {
  if (!name) return "Введите имя для отображения."
  if (name.length < DISPLAY_NAME_MIN_LENGTH) {
    return `Имя должно быть не короче ${DISPLAY_NAME_MIN_LENGTH} символов.`
  }
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Имя должно быть не длиннее ${DISPLAY_NAME_MAX_LENGTH} символов.`
  }
  if (!DISPLAY_NAME_REGEX.test(name)) {
    return "Имя может содержать только буквы, цифры и символы . _ -"
  }
  return null
}
