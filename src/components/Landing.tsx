import { useState } from 'react'
import { ArrowRight, CalendarDays, Download, MapPin } from 'lucide-react'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`
const companyUrl = 'https://18rajeshkumarg.github.io/indicasoftware/'
const roles = [
  'Full Stack Developer + Integrations', 'Admin/Audit Manager', 'AI Automations', 'AI Developer',
  'Android/IOS Developer', 'Voice/Non-Voice Process', 'Sales & Marketing', 'HR',
  'Recruiter & Consulting Team', 'Onboarding Process Team', 'Customer Support Representative',
]
const faqs = [
  ['Which roles are open?', 'Applications are open for the 11 roles listed above. Select a role to read its application form.'],
  ['How does the interview process work?', 'After applying, the candidate screen shows the planned next-day schedule: Round 1 from 11:30 AM to 11:55 AM and Round 2 from 12:40 PM to 1:10 PM (India time). Both rounds are virtual.'],
  ['Where is my Zoom link?', 'A Zoom meeting must be created by the hiring team. This site currently has no Zoom host integration, so it cannot create or send a real meeting link. The schedule screen indicates when a host link is required.'],
  ['Is face verification enabled?', 'The project includes a people detector for video, but it does not verify a person’s face or identity. Identity verification is not enabled in this application flow.'],
  ['What happens after both virtual rounds?', 'Candidates who advance can message the hiring team on WhatsApp to arrange the in-person Boss Round at the boss location. The location is shared by the hiring team.'],
  ['Who receives my application?', 'This static website has no application server or recruiter notification integration. The candidate details can be downloaded as a text file from the confirmation screen; submitting does not send them to the hiring team.'],
]
type Candidate = { name: string; experience: string; location: string; details: string }
const initial: Candidate = { name: '', experience: '', location: '', details: '' }
function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })
}
function Faq({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return <details className="border border-ink/15 bg-paper p-4"><summary className="cursor-pointer font-bold">{question}</summary><p className="mt-3 text-sm leading-relaxed text-ink/70">{answer}</p></details>
}

export default function Landing() {
  const [selected, setSelected] = useState<string | null>(null)
  const [candidate, setCandidate] = useState(initial)
  const [submitted, setSubmitted] = useState<Candidate | null>(null)
  const setField = (key: keyof Candidate, value: string) => setCandidate((prev) => ({ ...prev, [key]: value }))
  const download = () => {
    if (!submitted || !selected) return
    const text = [
      'ZARA AI INTERVIEW — CANDIDATE APPLICATION', `Role: ${selected}`, `Name: ${submitted.name}`,
      `Work experience: ${submitted.experience}`, `Location: ${submitted.location}`, `About candidate: ${submitted.details}`,
      `Planned interview date: ${tomorrow()} (India time)`, 'Round 1: 11:30 AM–11:55 AM', 'Round 2: 12:40 PM–1:10 PM',
      'Zoom link: Pending hiring team setup', 'Boss Round: In person; location to be shared by hiring team',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `candidate-${submitted.name.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }
  const whatsappText = encodeURIComponent('Hi, I have completed both virtual interview rounds and have been selected for the 3rd Interview (Boss Round). Please share the in-person meeting location and available time.')

  return <div className="min-h-screen bg-paper text-ink">
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href={companyUrl} className="flex items-center gap-3" aria-label="Visit Indica Software"><img src={brandLogo} alt="Indica Software" className="brand-logo-small brand-logo"/><span className="text-2xl font-black text-zara">ZARA</span><span className="font-mono2 text-[11px] uppercase tracking-[.2em]">AI Interview</span></a>
        <a href="#roles" className="font-mono2 text-xs uppercase tracking-widest hover:text-zara">Apply for a job</a>
      </div>
    </header>
    <main>
      <section className="bg-grid-light border-b border-ink/10"><div className="mx-auto max-w-5xl px-5 py-20 text-center">
        <p className="font-mono2 text-xs uppercase tracking-[.3em] text-zara">Careers · Indica Software</p>
        <h1 className="mt-5 text-5xl font-black leading-none sm:text-7xl">YOUR NEXT ROLE<br/><span className="text-zara">STARTS HERE.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">Explore open positions and apply. Shortlisted candidates attend two virtual interview rounds, followed by an in-person Boss Round.</p>
        <a href="#roles" className="mt-8 inline-flex items-center gap-2 bg-zara px-6 py-3 font-mono2 text-xs uppercase tracking-widest text-white hover:bg-ink">Apply for job <ArrowRight className="h-4 w-4"/></a>
        <div className="mx-auto mt-12 grid max-w-2xl gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3"><div className="bg-paper p-4"><b>Round 1</b><p className="text-sm text-ink/60">11:30 AM–11:55 AM</p></div><div className="bg-paper p-4"><b>Round 2</b><p className="text-sm text-ink/60">12:40 PM–1:10 PM</p></div><div className="bg-paper p-4"><b>Final round</b><p className="text-sm text-ink/60">In person · Boss location</p></div></div>
      </div></section>
      <section id="roles" className="bg-grid-light border-b border-ink/10"><div className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black sm:text-4xl">PICK A ROLE</h2><p className="mt-2 text-ink/60">Choose a position to open its application form.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">{roles.map((role) => <button key={role} onClick={() => { setSelected(role); setSubmitted(null); setCandidate(initial) }} className={`flex items-center justify-between border bg-paper p-5 text-left font-bold transition-colors hover:border-zara ${selected === role ? 'border-zara' : 'border-ink/15'}`}><span>{role}</span><ArrowRight className="h-4 w-4 shrink-0 text-zara"/></button>)}</div>
        {selected && !submitted && <form onSubmit={(e) => { e.preventDefault(); setSubmitted(candidate) }} className="mt-8 border border-ink/20 bg-paper p-6 sm:p-8">
          <h3 className="text-2xl font-black">Apply: {selected}</h3><p className="mt-2 text-sm text-ink/60">Share your details with the hiring team.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Name<input required value={candidate.name} onChange={(e) => setField('name', e.target.value)} className="mt-1 block w-full border border-ink/20 bg-white px-3 py-2 font-normal"/></label>
            <label className="text-sm font-semibold">Work experience<input required value={candidate.experience} onChange={(e) => setField('experience', e.target.value)} placeholder="e.g. 3 years" className="mt-1 block w-full border border-ink/20 bg-white px-3 py-2 font-normal"/></label>
            <label className="text-sm font-semibold">Location<input required value={candidate.location} onChange={(e) => setField('location', e.target.value)} className="mt-1 block w-full border border-ink/20 bg-white px-3 py-2 font-normal"/></label>
            <label className="text-sm font-semibold sm:col-span-2">Tell us about yourself<textarea required rows={4} value={candidate.details} onChange={(e) => setField('details', e.target.value)} className="mt-1 block w-full border border-ink/20 bg-white px-3 py-2 font-normal"/></label>
          </div><button className="mt-5 bg-zara px-6 py-3 font-mono2 text-xs uppercase tracking-widest text-white hover:bg-ink">Submit application</button>
        </form>}
        {selected && submitted && <div className="mt-8 border border-emerald-700/30 bg-white p-6 sm:p-8" aria-live="polite">
          <p className="font-mono2 text-xs uppercase tracking-widest text-emerald-700">Application details saved in this screen</p><h3 className="mt-2 text-2xl font-black">Interview schedule · {submitted.name}</h3>
          <p className="mt-2 text-sm text-ink/65">Role: {selected} · {submitted.location} · {submitted.experience}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="border border-ink/15 p-4"><CalendarDays className="h-5 w-5 text-zara"/><b className="mt-2 block">{tomorrow()}</b><p className="text-xs text-ink/55">India Standard Time (IST)</p></div><div className="border border-ink/15 p-4"><b>Two virtual rounds</b><p className="mt-2 text-sm">Round 1 · 11:30 AM–11:55 AM</p><p className="text-sm">Round 2 · 12:40 PM–1:10 PM</p></div></div>
          <div className="mt-4 border border-amber-600/30 bg-amber-50 p-4 text-sm"><b>Zoom link pending.</b> The hiring team must create and provide the meeting link. This site cannot book a Zoom meeting or deliver your application automatically.</div>
          <p className="mt-4 text-sm text-ink/70">Face verification is not active. The available YOLO component detects people in a video and does not verify identity. Do not treat this screen as a confirmed interview invitation.</p>
          <div className="mt-5 flex flex-wrap gap-3"><button onClick={download} className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white"><Download className="h-4 w-4"/>Download candidate .txt</button><a target="_blank" rel="noreferrer" href={`https://wa.me/917975044149?text=${whatsappText}`} className="inline-flex items-center gap-2 border border-ink/25 px-5 py-3 font-mono2 text-xs uppercase tracking-widest">Boss Round · WhatsApp <MapPin className="h-4 w-4"/></a></div>
        </div>}
      </div></section>
      <section className="border-b border-ink/10"><div className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">FREQUENTLY ASKED QUESTIONS</h2><div className="mt-7 space-y-3">{faqs.map(([question, answer]) => <Faq key={question} question={question} answer={answer}/>)}</div></div></section>
    </main>
    <footer className="bg-ink px-5 py-8 text-center text-sm text-white/60"><a href={companyUrl} className="text-white hover:text-zara">Indica Software</a> · Careers and interview information</footer>
  </div>
}
