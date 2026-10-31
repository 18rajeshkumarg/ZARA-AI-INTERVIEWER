// Browser-local candidate accounts.
//
// The GitHub Pages build is intentionally static: there is no API endpoint to
// call, so account creation and sign-in run entirely in the browser. Passwords
// are stored as salted PBKDF2 hashes (never plain text) and the session is a
// simple localStorage marker. This removes every "Failed to fetch" path.

export type LocalAccount = {
  salt: string
  passwordHash: string
  createdAt: string
}

export type AuthResult = { ok: true } | { ok: false; error: string }

const accountsKey = 'zara_candidate_accounts'
const sessionKey = 'zara_candidate_session'
const rememberedEmailKey = 'zara_candidate_email'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function readAccounts(): Record<string, LocalAccount> {
  try {
    const value = JSON.parse(localStorage.getItem(accountsKey) || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const accounts: Record<string, LocalAccount> = {}
    for (const [email, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!raw || typeof raw !== 'object') continue
      const record = raw as Record<string, unknown>
      if (typeof record.salt !== 'string' || typeof record.passwordHash !== 'string') continue
      accounts[normalizeEmail(email)] = {
        salt: record.salt,
        passwordHash: record.passwordHash,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
      }
    }
    return accounts
  } catch {
    return {}
  }
}

async function passwordHash(password: string, saltHex: string): Promise<string> {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) || [], (x) => Number.parseInt(x, 16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function rememberEmail(email: string): void {
  try {
    localStorage.setItem(rememberedEmailKey, normalizeEmail(email))
  } catch {
    /* storage may be unavailable in private mode */
  }
}

export function readRememberedEmail(): string {
  try {
    const value = localStorage.getItem(rememberedEmailKey) || ''
    return validEmail(value) ? normalizeEmail(value) : ''
  } catch {
    return ''
  }
}

export function currentSessionEmail(): string {
  try {
    const value = localStorage.getItem(sessionKey) || ''
    if (!value) return ''
    // Older builds stored an API token in this key. A token is not an account
    // email, so treat it as signed out instead of showing it in the header.
    if (!validEmail(value)) {
      localStorage.removeItem(sessionKey)
      return ''
    }
    return normalizeEmail(value)
  } catch {
    return ''
  }
}

export function accountExists(email: string): boolean {
  return Boolean(readAccounts()[normalizeEmail(email)])
}

export async function createAccount(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email)
  if (!validEmail(normalized)) return { ok: false, error: 'Enter a valid email address.' }
  if (password.length < 10) return { ok: false, error: 'Password must be at least 10 characters.' }
  if (!globalThis.crypto?.subtle) {
    return { ok: false, error: 'Secure account storage is not available in this browser.' }
  }

  const accounts = readAccounts()
  if (accounts[normalized]) {
    return { ok: false, error: 'An account already exists for this email. Please sign in.' }
  }

  try {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16))
    const salt = toHex(saltBytes)
    accounts[normalized] = {
      salt,
      passwordHash: await passwordHash(password, salt),
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(accountsKey, JSON.stringify(accounts))
    rememberEmail(normalized)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not create the account in this browser. Please try again.' }
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email)
  if (!validEmail(normalized)) return { ok: false, error: 'Enter a valid email address.' }
  if (!password) return { ok: false, error: 'Enter your password.' }

  const account = readAccounts()[normalized]
  if (!account) {
    return { ok: false, error: 'No account found for this email. Choose Create account first.' }
  }

  try {
    if (await passwordHash(password, account.salt) !== account.passwordHash) {
      return { ok: false, error: 'Incorrect email or password.' }
    }
    localStorage.setItem(sessionKey, normalized)
    rememberEmail(normalized)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not sign in with this browser. Please try again.' }
  }
}

export function signOut(): void {
  try {
    localStorage.removeItem(sessionKey)
  } catch {
    /* ignore */
  }
}
