// Sample employee card references for hired candidates.
//
// Both PDFs are generated in the browser with jsPDF and are exactly the size of
// a standard CR80 card (85.6 mm x 54 mm). They are explicitly marked as samples
// and are not valid credentials. Print at 100% / "Actual size" to preserve size.

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
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

async function companyLogoDataUrl(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}indicasoftware-logo.svg`)
  if (!response.ok) throw new Error(`Company logo request failed: ${response.status}`)
  const logo = new Image()
  const objectUrl = URL.createObjectURL(await response.blob())
  try {
    logo.src = objectUrl
    await logo.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 720
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare company logo for the employee card.')
    context.drawImage(logo, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function referenceQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(`SAMPLE-REFERENCE:${code}`, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
}

function drawSampleDisclaimer(doc: jsPDF): void {
  doc.setFillColor(150, 32, 45)
  doc.rect(0, 48.5, CARD_WIDTH_MM, 5.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4)
  doc.setTextColor(255, 255, 255)
  doc.text('SAMPLE ONLY · NOT VALID FOR IDENTIFICATION OR ACCESS', CARD_WIDTH_MM / 2, 51.8, { align: 'center' })
}

function drawIdCard(doc: jsPDF, application: Application, photo: string | null, logo: string, qr: string): void {
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
  doc.addImage(logo, 'PNG', 4.5, 1.6, 8.6, 8.6)
  doc.text('INDICA SOFTWARE', 14, 5.3)
  doc.setCharSpace(0)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.4)
  doc.setTextColor(236, 233, 224)
  doc.text('SAMPLE EMPLOYEE CARD', 14, 9.2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.1)
  doc.setTextColor(...GOLD)
  doc.text('ZARA AI INTERVIEWER', width - 5, 5.3, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 212, 220)
  doc.text('REFERENCE ONLY', width - 5, 9.2, { align: 'right' })

  // Photo frame.
  const photoX = 5
  const photoY = 16.4
  const photoW = 17
  const photoH = 20.4
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

  doc.addImage(qr, 'PNG', photoX, 38, 9, 9)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(3.6)
  doc.setTextColor(...MUTED)
  doc.setCharSpace(0.25)
  doc.text(code, photoX + 10, 43)
  doc.setFontSize(2.7)
  doc.text('REFERENCE ONLY', photoX + 10, 45.4)
  doc.setCharSpace(0)

  // Name and role.
  const textX = 25
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  const nameLines = fit(doc, application.name.toUpperCase(), 55, 2)
  doc.text(nameLines, textX, 20.6)
  const nameBottom = 20.6 + (nameLines.length - 1) * 4.3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(...ZARA)
  const roleLines = fit(doc, application.role.toUpperCase(), 55, 2)
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
  field('EMPLOYEE REFERENCE', code, textX, rowOne, 27)
  field('JOINED', joiningDate(application), 56, rowOne, 24)
  field('LOCATION', application.location || '-', textX, rowTwo, 27)
  field('CONTACT', application.phone || '-', 56, rowTwo, 24)

  drawSampleDisclaimer(doc)
}

function drawLogCard(doc: jsPDF, application: Application, logo: string, qr: string): void {
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
  doc.addImage(logo, 'PNG', 4.5, 1.5, 8.2, 8.2)
  doc.text('EMPLOYEE OFFICE LOG', 14, 5.2)
  doc.setCharSpace(0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.4)
  doc.setTextColor(236, 233, 224)
  doc.text('SAMPLE IN / OUT REFERENCE', 14, 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.1)
  doc.setTextColor(...GOLD)
  doc.text('INDICA SOFTWARE', width - 5, 5.2, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 212, 220)
  doc.text('SAMPLE ONLY', width - 5, 9, { align: 'right' })

  // Employee line.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.6)
  doc.setTextColor(...INK)
  const nameLines = fit(doc, application.name.toUpperCase(), 60, 1)
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
  const tableTop = 25.3
  const rowHeight = 3.5
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
  if (column.x !== left) doc.line(column.x, tableTop, column.x, tableTop + 4 + 5 * rowHeight)
  })
  doc.setCharSpace(0)

  for (let row = 0; row < 5; row += 1) {
    const y = tableTop + 4 + row * rowHeight
    doc.setDrawColor(...LINE)
    doc.line(left, y + rowHeight, right, y + rowHeight)
  }
  doc.setDrawColor(...LINE)
  doc.rect(left, tableTop, right - left, 4 + 5 * rowHeight, 'S')

  doc.addImage(qr, 'PNG', 70, 13.5, 10.5, 10.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(2.7)
  doc.setTextColor(...MUTED)
  doc.text('REFERENCE ONLY', 75.25, 24.7, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(3.1)
  doc.setTextColor(...MUTED)
  doc.text('QR contains a sample reference code only; it does not verify identity.', 5, 47.4)
  drawSampleDisclaimer(doc)
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
  const [logo, qr] = await Promise.all([companyLogoDataUrl(), referenceQrDataUrl(code)])

  const idDoc = newCard()
  idDoc.setProperties({
    title: `Sample Employee ID Card - ${code}`,
    subject: `Sample reference card for ${application.name}; not valid for identification`,
    author: 'Indica Software',
    creator: 'ZARA AI Interviewer',
  })
  drawIdCard(idDoc, application, photoUrl, logo, qr)

  const logDoc = newCard()
  logDoc.setProperties({
    title: `Sample Employee Office Log Card - ${code}`,
    subject: `Sample reference log card for ${application.name}; not valid for access`,
    author: 'Indica Software',
    creator: 'ZARA AI Interviewer',
  })
  drawLogCard(logDoc, application, logo, qr)

  return {
    idCard: idDoc.output('blob'),
    logCard: logDoc.output('blob'),
    code,
  }
}

export function idCardFilename(application: Application): string {
  return `${employeeCode(application)}-SAMPLE-Employee-ID-Reference.pdf`
}

export function logCardFilename(application: Application): string {
  return `${employeeCode(application)}-SAMPLE-Office-Login-Logout-Reference.pdf`
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
