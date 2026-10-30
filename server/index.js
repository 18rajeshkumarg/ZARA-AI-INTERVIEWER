import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import nodemailer from 'nodemailer'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROLES as roles } from '../shared/roles.js'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 8787)
const here = path.dirname(fileURLToPath(import.meta.url))
const dataRoot = path.resolve(process.env.DATA_DIR || path.join(here, 'data'))
const candidatesDir = path.join(dataRoot, 'Candidates')
const uploadsDir = path.join(dataRoot, 'Uploads')
const jwtSecret = process.env.JWT_SECRET
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } })
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null

if (!process.env.DATABASE_URL || !jwtSecret || jwtSecret.length < 32) {
  throw new Error('DATABASE_URL and a JWT_SECRET of at least 32 characters are required.')
}

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,https://18rajeshkumarg.github.io').split(',').map((x) => x.trim()), credentials: false }))
app.use(express.json({ limit: '32kb' }))
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }))
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false })
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

async function initialize() {
  await mkdir(candidatesDir, { recursive: true })
  await mkdir(uploadsDir, { recursive: true })
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id BIGSERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE, otp_hash TEXT, otp_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS applications (
      id BIGSERIAL PRIMARY KEY, candidate_id BIGINT NOT NULL REFERENCES candidates(id),
      role TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, experience TEXT NOT NULL,
      location TEXT NOT NULL, about TEXT NOT NULL, photo_filename TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      round1_completed BOOLEAN NOT NULL DEFAULT FALSE, round2_completed BOOLEAN NOT NULL DEFAULT FALSE,
      boss_round_invited BOOLEAN NOT NULL DEFAULT FALSE, boss_round_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id BIGSERIAL PRIMARY KEY, candidate_id BIGINT REFERENCES candidates(id),
      application_id BIGINT REFERENCES applications(id), event TEXT NOT NULL,
      ip_address TEXT, user_agent TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS round1_completed BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS round2_completed BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS boss_round_invited BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS boss_round_completed BOOLEAN NOT NULL DEFAULT FALSE;
  `)
}

function clean(value, max = 2000) { return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) }
function hash(value) { return createHash('sha256').update(value).digest('hex') }
function tokenFor(user, admin = false) { return jwt.sign({ sub: String(user.id), email: user.email, admin }, jwtSecret, { expiresIn: admin ? '2h' : '12h', issuer: 'zara-ai-interviewer' }) }
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' })
  try { req.auth = jwt.verify(token, jwtSecret, { issuer: 'zara-ai-interviewer' }); return next() }
  catch { return res.status(401).json({ error: 'Your session has expired. Please sign in again.' }) }
}
function requireAdmin(req, res, next) { if (!req.auth?.admin) return res.status(403).json({ error: 'Administrator access required.' }); next() }
async function activity(req, event, applicationId = null) {
  await pool.query('INSERT INTO activity_log(candidate_id, application_id, event, ip_address, user_agent) VALUES($1,$2,$3,$4,$5)', [req.auth?.admin ? null : req.auth?.sub ?? null, applicationId, event, req.ip, clean(req.get('user-agent'), 500)])
}
function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next) }
function candidateLabel(id) { return `candidate-${String(id).padStart(6, '0')}` }
function safeTxt(s) { return clean(s, 4000).replace(/\r?\n/g, ' ') }
function photoExt(file) {
  const b = file.buffer
  if (b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg'
  if (b.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return '.png'
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return '.webp'
  return null
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  if (!mailer) return res.status(503).json({ error: 'Email verification is not configured on this server.' })
  const email = clean(req.body.email, 254).toLowerCase()
  const password = String(req.body.password || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) return res.status(400).json({ error: 'Enter a valid email and a password of at least 10 characters.' })
  const otp = String(randomInt(100000, 1000000))
  const passwordHash = await bcrypt.hash(password, 12)
  let result
  try {
    result = await pool.query(`INSERT INTO candidates(email,password_hash,otp_hash,otp_expires_at) VALUES($1,$2,$3,NOW() + INTERVAL '10 minutes') RETURNING id`, [email,passwordHash,hash(otp)])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account already exists for this email. Sign in instead.' })
    throw error
  }
  try {
    await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: email, subject: 'Verify your ZARA AI Interview account', text: `Your verification code is ${otp}. It expires in 10 minutes.` })
  } catch (error) {
    await pool.query('DELETE FROM candidates WHERE id=$1', [result.rows[0].id])
    throw error
  }
  await activity({ ...req, auth: { sub: result.rows[0].id } }, 'candidate_registered')
  res.status(201).json({ message: 'Verification code sent to your email.' })
}))
app.post('/api/auth/verify-email', authLimiter, asyncRoute(async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase(), otp = String(req.body.code || '')
  const result = await pool.query('SELECT * FROM candidates WHERE email=$1', [email])
  const user = result.rows[0]
  if (!user || user.email_verified || !user.otp_hash || new Date(user.otp_expires_at) < new Date() || hash(otp) !== user.otp_hash) return res.status(400).json({ error: 'Invalid or expired verification code.' })
  await pool.query('UPDATE candidates SET email_verified=TRUE,otp_hash=NULL,otp_expires_at=NULL WHERE id=$1', [user.id])
  await activity({ ...req, auth: { sub: user.id } }, 'email_verified')
  res.json({ token: tokenFor(user), email: user.email })
}))
app.post('/api/auth/resend-code', authLimiter, asyncRoute(async (req, res) => {
  if (!mailer) return res.status(503).json({ error: 'Email verification is not configured on this server.' })
  const email = clean(req.body.email, 254).toLowerCase()
  const result = await pool.query('SELECT id,email_verified FROM candidates WHERE email=$1', [email])
  const user = result.rows[0]
  if (!user || user.email_verified) return res.status(200).json({ message: 'If verification is still required, a new code has been sent.' })
  const otp = String(randomInt(100000, 1000000))
  await pool.query("UPDATE candidates SET otp_hash=$1,otp_expires_at=NOW() + INTERVAL '10 minutes' WHERE id=$2", [hash(otp),user.id])
  await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: email, subject: 'Your new ZARA AI Interview verification code', text: `Your verification code is ${otp}. It expires in 10 minutes.` })
  await activity({ ...req, auth: { sub: user.id } }, 'verification_code_resent')
  res.json({ message: 'A new verification code has been sent.' })
}))
app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase(), password = String(req.body.password || '')
  const result = await pool.query('SELECT * FROM candidates WHERE email=$1', [email])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
  if (!user.email_verified) return res.status(403).json({ error: 'Verify your email before signing in.' })
  await activity({ ...req, auth: { sub: user.id } }, 'candidate_signed_in')
  res.json({ token: tokenFor(user), email: user.email })
}))

app.post('/api/applications', requireAuth, upload.single('photo'), asyncRoute(async (req, res) => {
  const userResult = await pool.query('SELECT email_verified FROM candidates WHERE id=$1', [req.auth.sub])
  if (!userResult.rows[0]?.email_verified) return res.status(403).json({ error: 'Verify your email before applying.' })
  const role = clean(req.body.role, 120), name = clean(req.body.name, 120), phone = clean(req.body.phone, 40)
  const experience = clean(req.body.experience, 120), location = clean(req.body.location, 160), about = clean(req.body.about, 4000)
  if (!roles.includes(role)) return res.status(400).json({ error: 'Choose one of the listed roles.' })
  if (!name || !phone || !experience || !location || !about || !req.file) return res.status(400).json({ error: 'Complete all fields and upload a face photo.' })
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number.' })
  const extension = photoExt(req.file)
  if (!extension) return res.status(400).json({ error: 'Upload a valid JPEG, PNG, or WebP image.' })
  const inserted = await pool.query(`INSERT INTO applications(candidate_id,role,name,phone,experience,location,about,photo_filename) VALUES($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING id`, [req.auth.sub,role,name,phone,experience,location,about])
  const id = inserted.rows[0].id, label = candidateLabel(id), photoFilename = `${label}${extension}`
  const txtPath = path.join(candidatesDir, `${label}.txt`), photoPath = path.join(uploadsDir, photoFilename)
  const body = [`Application: ${label}`, `Role: ${safeTxt(role)}`, `Name: ${safeTxt(name)}`, `Email: ${safeTxt(req.auth.email)}`, `Phone: ${safeTxt(phone)}`, `Work experience: ${safeTxt(experience)}`, `Location: ${safeTxt(location)}`, `About: ${safeTxt(about)}`, `Submitted: ${new Date().toISOString()}`, 'Status: pending'].join('\n') + '\n'
  try {
    await writeFile(photoPath, req.file.buffer, { flag: 'wx', mode: 0o600 })
    await writeFile(txtPath, body, { flag: 'wx', mode: 0o600 })
    await pool.query('UPDATE applications SET photo_filename=$1 WHERE id=$2', [photoFilename,id])
  } catch (error) {
    await unlink(photoPath).catch(() => {})
    await unlink(txtPath).catch(() => {})
    await pool.query('DELETE FROM applications WHERE id=$1', [id])
    throw error
  }
  await activity(req, 'application_submitted', id)
  res.status(201).json({ id: label, role, status: 'pending', message: 'Application submitted.' })
}))
app.get('/api/applications/mine', requireAuth, asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT id,role,status,round1_completed,round2_completed,boss_round_invited,boss_round_completed,created_at,reviewed_at FROM applications WHERE candidate_id=$1 ORDER BY id DESC', [req.auth.sub])
  res.json({ applications: result.rows.map((row) => ({ id: candidateLabel(row.id), role: row.role, status: row.status, round1Completed: row.round1_completed, round2Completed: row.round2_completed, bossRoundInvited: row.boss_round_invited, bossRoundCompleted: row.boss_round_completed, createdAt: row.created_at, reviewedAt: row.reviewed_at })) })
}))
app.post('/api/admin/login', authLimiter, asyncRoute(async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase(), password = String(req.body.password || '')
  const expectedEmail = (process.env.ADMIN_EMAIL || '').toLowerCase(), expectedPassword = process.env.ADMIN_PASSWORD || ''
  const same = (a, b) => { const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb) }
  if (!expectedEmail || !expectedPassword || !same(email, expectedEmail) || !same(password, expectedPassword)) return res.status(401).json({ error: 'Administrator credentials are incorrect or not configured.' })
  await activity({ ...req, auth: { admin: true, sub: null } }, 'administrator_signed_in')
  res.json({ token: tokenFor({ id: 'admin', email }, true) })
}))
app.get('/api/admin/applications', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query(`SELECT a.id,a.role,a.name,a.phone,a.experience,a.location,a.about,a.status,a.round1_completed,a.round2_completed,a.boss_round_invited,a.boss_round_completed,a.created_at,c.email,a.photo_filename FROM applications a JOIN candidates c ON c.id=a.candidate_id ORDER BY a.id DESC`)
  await activity(req, 'administrator_applications_viewed')
  res.json({ applications: result.rows.map((x) => ({ ...x, id: candidateLabel(x.id), photoUrl: `/api/admin/uploads/${encodeURIComponent(x.photo_filename)}` })) })
}))
app.patch('/api/admin/applications/:id/status', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const rawId = clean(req.params.id)
  const allowed = ['round1_completed','round2_completed','boss_round_invited','boss_round_completed','approved','rejected']
  if (!/^candidate-\d{6,}$/.test(rawId) || !allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid application or review status.' })
  const numericId = Number(rawId.slice(10))
  const current = await pool.query('SELECT * FROM applications WHERE id=$1', [numericId])
  if (!current.rowCount) return res.status(404).json({ error: 'Application not found.' })
  const existing = current.rows[0]
  if (req.body.status === 'round2_completed' && !existing.round1_completed) return res.status(409).json({ error: 'Round 1 must be complete before Round 2 can be marked complete.' })
  if (req.body.status === 'boss_round_invited' && !(existing.round1_completed && existing.round2_completed)) return res.status(409).json({ error: 'Both virtual rounds must be marked complete before inviting a candidate to the Boss Round.' })
  if (req.body.status === 'boss_round_completed' && !existing.boss_round_invited) return res.status(409).json({ error: 'Invite the candidate to the Boss Round before marking it complete.' })
  if (req.body.status === 'approved' && !(existing.round1_completed && existing.round2_completed && existing.boss_round_completed)) return res.status(409).json({ error: 'Both virtual rounds and the Boss Round must be completed before approval.' })
  const column = { round1_completed: 'round1_completed', round2_completed: 'round2_completed', boss_round_invited: 'boss_round_invited', boss_round_completed: 'boss_round_completed', approved: 'status', rejected: 'status' }[req.body.status]
  const value = ['approved','rejected'].includes(req.body.status) ? req.body.status : true
  const result = await pool.query(`UPDATE applications SET ${column}=$1,reviewed_at=NOW() WHERE id=$2 RETURNING id,candidate_id,status`, [value,numericId])
  if (!result.rowCount) return res.status(404).json({ error: 'Application not found.' })
  await activity({ ...req, auth: { admin: true, sub: null } }, `application_${req.body.status}`, numericId)
  res.json({ id: candidateLabel(result.rows[0].id), status: result.rows[0].status })
}))
app.get('/api/admin/uploads/:filename', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const name = path.basename(req.params.filename)
  if (name !== req.params.filename || !/^candidate-\d{6,}\.(jpg|png|webp)$/.test(name)) return res.status(400).end()
  const row = await pool.query('SELECT id FROM applications WHERE photo_filename=$1', [name])
  if (!row.rowCount) return res.status(404).end()
  await activity(req, 'candidate_photo_viewed', row.rows[0].id)
  res.sendFile(path.join(uploadsDir, name), { headers: { 'Cache-Control': 'no-store' } })
}))

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller.' : 'Invalid upload.' })
  res.status(500).json({ error: 'The server could not complete this request.' })
})

initialize().then(() => app.listen(port, () => console.log(`ZARA application API listening on ${port}`))).catch((error) => { console.error(error); process.exit(1) })
