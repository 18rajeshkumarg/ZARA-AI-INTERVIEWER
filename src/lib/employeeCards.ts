// Premium employee cards for hired candidates.
//
// Both PDFs are generated in the browser with jsPDF and are exactly the size of
// a standard CR80 card (85.6 mm x 54 mm). Nothing is scaled to A4: when the
// admin prints or xeroxes the file at 100% / "Actual size", the output is a
// card. All text and shapes are vector, so the print stays sharp at any DPI.

import { jsPDF } from 'jspdf'
import { employeeCode, type Application } from './applications'

export const CARD_WIDTH_MM = 85.6
export const CARD_HEIGHT_MM = 54

type Rgb = readonly [number, number, number]

const NAVY: Rgb = [11, 16, 32]
const GOLD: Rgb = [201, 162, 39]
const ZARA: Rgb = [200, 16, 46]
const INK: Rgb = [24, 26, 33]
const MUTED: Rgb = [112, 114, 124]
const PAPER: Rgb = [250, 248, 243]
const LINE: Rgb = [214, 205, 186]

export type EmployeeCards = {
  idCard: Blob
  logCard: Blob
  code: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'IS'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function cardDate(iso?: string): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date).toUpperCase()
}

function joiningDate(application: Application): string {
  return cardDate(
    application.approvedAt
      || application.bossCompletedAt
      || application.selectedAt
      || application.updatedAt,
  )
}

function fit(doc: jsPDF, value: string, width: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(value, width) as string[]
  return lines.slice(0, maxLines)
}

/** Deterministic bar pattern so every card has a unique printed code strip. */
function barWidths(seed: string): number[] {
  let state = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i)
    state = Math.imul(state, 16777619)
  }
  const widths: number[] = []
  for (let i = 0; i < 34; i += 1) {
    state = Math.imul(state ^ (i + 1), 16777619)
    const value = (state >>> 0) % 100
    widths.push(value < 18 ? 0.18 : value < 52 ? 0.36 : 0.62)
  }
  return widths
}

function drawBarcode(doc: jsPDF, seed: string, x: number, y: number, width: number, height: number): void {
  const widths = barWidths(seed)
  const total = widths.reduce((sum, value) => sum + value, 0)
  const scale = width / total
  doc.setFillColor(...INK)
  let cursor = x
  widths.forEach((barWidth, index) => {
    const w = barWidth * scale
    if (index % 2 === 0) doc.rect(cursor, y, w, height, 'F')
    cursor += w
  })
}

async function photoDataUrl(photo: Blob | null): Promise<string | null> {
  if (!photo) return null
  try {
    const bitmap = await createImageBitmap(photo)
    const targetWidth = 480
    const targetHeight = 576
    const scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close?.()
      return null
    }
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, targetWidth, targetHeight)
    context.drawImage(bitmap, (targetWidth - width) / 2, (targetHeight - height) / 2, width, height)
    bitmap.close?.()
    return canvas.toDataURL('image/jpeg', 0.94)
  } catch {
    return null
  }
}

function drawIdCard(doc: jsPDF, application: Application, photo: string | null): void {
  const width = CARD_WIDTH_MM
  const height = CARD_HEIGHT_MM
  const code = employeeCode(application)

  doc.setFillColor(...PAPER)
  doc.rect(0, 0, width, height, 'F')

  // Header band.
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, width, 13, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 12.4, width, 0.6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  doc.setTextColor(...GOLD)
  doc.setCharSpace(0.4)
  doc.text('INDICA SOFTWARE', 5, 5.3)
  doc.setCharSpace(0)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.4)
  doc.setTextColor(236, 233, 224)
  doc.text('PREMIUM EMPLOYEE ID CARD', 5, 9.2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.1)
  doc.setTextColor(...GOLD)
  doc.text('ZARA AI INTERVIEWER', width - 5, 5.3, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 212, 220)
  doc.text('AUTHORISED EMPLOYEE', width - 5, 9.2, { align: 'right' })

  // Photo frame.
  const photoX = 5
  const photoY = 16.4
  const photoW = 20
  const photoH = 24
  doc.setFillColor(255, 255, 255)
  doc.rect(photoX, photoY, photoW, photoH, 'F')
  if (photo) {
    doc.addImage(photo, 'JPEG', photoX, photoY, photoW, photoH)
  } else {
    doc.setFillColor(...NAVY)
    doc.rect(photoX, photoY, photoW, photoH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...GOLD)
    doc.text(initials(application.name), photoX + photoW / 2, photoY + photoH / 2 + 3.2, { align: 'center' })
  }
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.45)
  doc.rect(photoX, photoY, photoW, photoH, 'S')

  // Barcode under the photo.
  drawBarcode(doc, code, photoX, 42.3, photoW, 3.1)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(3.6)
  doc.setTextColor(...MUTED)
  doc.setCharSpace(0.25)
  doc.text(code, photoX, 47.2)
  doc.setCharSpace(0)

  // Name and role.
  const textX = 28.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  const nameLines = fit(doc, application.name.toUpperCase(), 51.5, 2)
  doc.text(nameLines, textX, 20.6)
  const nameBottom = 20.6 + (nameLines.length - 1) * 4.3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(...ZARA)
  const roleLines = fit(doc, application.role.toUpperCase(), 51.5, 2)
  doc.text(roleLines, textX, nameBottom + 4.2)

  const dividerY = nameBottom + 4.2 + (roleLines.length - 1) * 2.6 + 2.2
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.25)
  doc.line(textX, dividerY, width - 5, dividerY)

  // Detail fields.
  const field = (label: string, value: string, x: number, y: number, maxWidth: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(3.5)
    doc.setTextColor(...MUTED)
    doc.setCharSpace(0.3)
    doc.text(label, x, y)
    doc.setCharSpace(0)
    doc.setFontSize(5.3)
    doc.setTextColor(...INK)
    const lines = fit(doc, value || '-', maxWidth, 1)
    doc.text(lines, x, y + 2.7)
  }

  const rowOne = dividerY + 4.2
  const rowTwo = rowOne + 6.6
  field('EMPLOYEE ID', code, textX, rowOne, 24)
  field('JOINED', joiningDate(application), 54.5, rowOne, 26)
  field('LOCATION', application.location || '-', textX, rowTwo, 24)
  field('CONTACT', application.phone || '-', 54.5, rowTwo, 26)

  // Footer band.
  doc.setFillColor(...NAVY)
  doc.rect(0, height - 6.4, width, 6.4, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, height - 6.9, width, 0.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(3.6)
  doc.setTextColor(...GOLD)
  doc.setCharSpace(0.3)
  doc.text('AUTHORISED BY THE BOSS', 5, height - 2.4)
  doc.setCharSpace(0)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(224, 226, 233)
  doc.text('VALID WITH PHOTO ID', width - 5, height - 2.4, { align: 'right' })
}

function drawLogCard(doc: jsPDF, application: Application): void {
  const width = CARD_WIDTH_MM
  const height = CARD_HEIGHT_MM
  const code = employeeCode(application)

  doc.setFillColor(...PAPER)
  doc.rect(0, 0, width, height, 'F')

  // Header band.
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, width, 12, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 11.4, width, 0.6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...GOLD)
  doc.setCharSpace(0.35)
  doc.text('EMPLOYEE OFFICE LOG', 5, 5.2)
  doc.setCharSpace(0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.4)
  doc.setTextColor(236, 233, 224)
  doc.text('PREMIUM IN / OUT CARD', 5, 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.1)
  doc.setTextColor(...GOLD)
  doc.text('INDICA SOFTWARE', width - 5, 5.2, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 212, 220)
  doc.text('OFFICIAL RECORD', width - 5, 9, { align: 'right' })

  // Employee line.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.6)
  doc.setTextColor(...INK)
  const nameLines = fit(doc, application.name.toUpperCase(), 56, 1)
  doc.text(nameLines, 5, 16.4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.6)
  doc.setTextColor(...ZARA)
  doc.setCharSpace(0.15)
  doc.text(`${code}  |  ${application.role.toUpperCase()}`, 5, 20.1)
  doc.setCharSpace(0)

  // Table.
  const left = 5
  const right = width - 5
  const tableTop = 22.6
  const columns = [
    { label: 'DATE', x: left, width: 19 },
    { label: 'LOG-IN', x: left + 19, width: 20 },
    { label: 'LOG-OUT', x: left + 39, width: 20 },
    { label: 'SIGN', x: left + 59, width: right - (left + 59) },
  ]

  doc.setFillColor(233, 228, 214)
  doc.rect(left, tableTop, right - left, 4, 'F')
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.rect(left, tableTop, right - left, 4, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(3.5)
  doc.setTextColor(...INK)
  doc.setCharSpace(0.3)
  columns.forEach((column) => {
    doc.text(column.label, column.x + 1.4, tableTop + 2.7)
    if (column.x !== left) doc.line(column.x, tableTop, column.x, tableTop + 24.5)
  })
  doc.setCharSpace(0)

  const rowHeight = 4.1
  for (let row = 0; row < 5; row += 1) {
    const y = tableTop + 4 + row * rowHeight
    doc.setDrawColor(...LINE)
    doc.line(left, y + rowHeight, right, y + rowHeight)
  }
  doc.setDrawColor(...LINE)
  doc.rect(left, tableTop, right - left, 4 + 5 * rowHeight, 'S')

  // Footer.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(3.4)
  doc.setTextColor(...MUTED)
  doc.text('Present this card with your Employee ID at the office gate.', 5, height - 2.6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD)
  doc.text('OFFICIAL LOG CARD', width - 5, height - 2.6, { align: 'right' })
}

function newCard(): jsPDF {
  // With orientation landscape jsPDF lays the page out as 85.6 x 54 mm.
  return new jsPDF({
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
    orientation: 'landscape',
    compress: true,
  })
}

/**
 * Builds both Premium cards. `photo` is the candidate's stored face photo; when
 * it is missing the ID card shows elegant initials instead.
 */
export async function generateEmployeeCards(application: Application, photo: Blob | null): Promise<EmployeeCards> {
  const code = employeeCode(application)
  const photoUrl = await photoDataUrl(photo)

  const idDoc = newCard()
  idDoc.setProperties({
    title: `Premium Employee ID Card - ${code}`,
    subject: `Employee ID card for ${application.name}`,
    author: 'Indica Software',
    creator: 'ZARA AI Interviewer',
  })
  drawIdCard(idDoc, application, photoUrl)

  const logDoc = newCard()
  logDoc.setProperties({
    title: `Premium Employee Office Log Card - ${code}`,
    subject: `Office log-in / log-out card for ${application.name}`,
    author: 'Indica Software',
    creator: 'ZARA AI Interviewer',
  })
  drawLogCard(logDoc, application)

  return {
    idCard: idDoc.output('blob'),
    logCard: logDoc.output('blob'),
    code,
  }
}

export function idCardFilename(application: Application): string {
  return `${employeeCode(application)}-Premium-Employee-ID-Card.pdf`
}

export function logCardFilename(application: Application): string {
  return `${employeeCode(application)}-Premium-Office-Login-Logout-Card.pdf`
}

/** Triggers a normal browser download without leaving the page. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}
