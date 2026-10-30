import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`
export const companyUrl = 'https://18rajeshkumarg.github.io/indicasoftware/'
export const hiredUrl = 'https://roles-backend.onrender.com'
export const whatsappNumber = '917975044149'

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <a href={companyUrl} className="flex items-center gap-3" aria-label="Visit Indica Software">
            <img src={brandLogo} alt="Indica Software" className="brand-logo-small brand-logo" />
            <span className="text-2xl font-black text-zara">ZARA</span>
            <span className="font-mono2 text-[11px] uppercase tracking-[.2em]">AI Interview</span>
          </a>
          <div className="flex items-center gap-4">
            <Link to="/" className="font-mono2 text-xs uppercase tracking-widest hover:text-zara">
              All roles
            </Link>
            <a
              href={companyUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 border border-ink/15 px-3 py-2 font-mono2 text-[10px] uppercase tracking-[.16em] hover:border-zara hover:text-zara sm:inline-flex"
            >
              Indica Software <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>
      {children}
      <footer className="bg-ink px-5 py-10 text-center text-sm text-white/60">
        <p>
          <a href={companyUrl} className="text-white hover:text-zara">Indica Software</a> · Careers and interview information
        </p>
        <p className="mt-2 text-xs text-white/35">
          Virtual rounds 11:30 AM–11:55 AM and 12:40 PM–1:10 PM IST · Boss Round in person ·{' '}
          <Link to="/admin" className="underline hover:text-white/60">Hiring review</Link>
        </p>
      </footer>
    </div>
  )
}
