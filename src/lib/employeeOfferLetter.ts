import { jsPDF } from 'jspdf'
import type { Application, EmployeeOfferLetter } from './applications'

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
    if (!context) throw new Error('Could not prepare company logo for the offer letter.')
    context.drawImage(logo, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function addWrappedText(doc: jsPDF, value: string, x: number, y: number, width: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(value, width) as string[]
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

export async function downloadEmployeeOfferLetter(
  application: Application,
  offer: EmployeeOfferLetter,
): Promise<void> {
  const logo = await companyLogoDataUrl()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  let y = 22

  doc.setFillColor(11, 16, 32)
  doc.rect(0, 0, pageWidth, 43, 'F')
  doc.addImage(logo, 'PNG', margin, 7, 28, 28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(offer.employerName.toUpperCase(), 52, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(230, 230, 235)
  doc.text(doc.splitTextToSize(offer.employerAddress, pageWidth - 68), 52, 25)

  y = 56
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(24, 26, 33)
  doc.text('OFFER LETTER', margin, y)
  y += 11

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 82, 90)
  doc.text(`Date: ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date(offer.issuedAt))}`, margin, y)
  y += 10
  doc.setTextColor(24, 26, 33)
  y = addWrappedText(doc, `To: ${application.name}`, margin, y, contentWidth, 5)
  y = addWrappedText(doc, `Email: ${application.email}  |  Phone: ${application.phone}`, margin, y + 1, contentWidth, 5)
  y = addWrappedText(doc, `Candidate reference: ${application.id}`, margin, y + 1, contentWidth, 5)
  y += 7
  y = addWrappedText(
    doc,
    `Dear ${application.name},`,
    margin,
    y,
    contentWidth,
    5,
  ) + 2
  y = addWrappedText(
    doc,
    `Following your successful Boss Round interview, ${offer.employerName} is pleased to offer you employment in the role of ${application.role}. This offer is subject to the terms below and completion of the stated onboarding requirements.`,
    margin,
    y,
    contentWidth,
    5,
  ) + 4

  const terms: Array<[string, string]> = [
    ['Role', application.role],
    ['Compensation', offer.compensation],
    ['Joining date', offer.joiningDate],
    ['Work location', offer.workLocation],
    ['Employment type', offer.employmentType],
    ['Probation', offer.probation],
    ['Working hours', offer.workingHours],
    ['Benefits and conditions', offer.benefitsAndConditions],
  ]
  for (const [label, value] of terms) {
    const lines = doc.splitTextToSize(`${label}: ${value}`, contentWidth) as string[]
    const height = lines.length * 5 + 2
    if (y + height > 235) {
      doc.addPage()
      y = 24
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(24, 26, 33)
    doc.text(lines, margin, y)
    y += height
  }

  y += 4
  y = addWrappedText(
    doc,
    'Please sign and return a copy of this letter to confirm your acceptance. Your onboarding is subject to submission and verification of the required documents.',
    margin,
    y,
    contentWidth,
    5,
  ) + 8
  if (y > 244) {
    doc.addPage()
    y = 24
  }
  doc.text('Sincerely,', margin, y)
  y += 7
  const signatureFormat = offer.signatureDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
  doc.addImage(offer.signatureDataUrl, signatureFormat, margin, y, 42, 18)
  y += 21
  doc.setFont('helvetica', 'bold')
  doc.text(offer.signatoryName, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(offer.signatoryTitle, margin, y + 5)

  doc.setFontSize(8)
  doc.setTextColor(110, 112, 120)
  doc.text('Please print this offer letter in color for your records.', margin, 285)
  doc.setProperties({
    title: `Employment Offer - ${application.name} - ${application.role}`,
    subject: `Employment offer issued ${offer.issuedAt}`,
    author: offer.employerName,
    creator: 'ZARA AI Interviewer',
  })
  doc.save(`${application.id}-${application.role.replace(/[^a-z0-9]+/gi, '-')}-Offer-Letter.pdf`)
}
