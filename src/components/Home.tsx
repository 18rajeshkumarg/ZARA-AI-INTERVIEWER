import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
  Video,
} from 'lucide-react'
import { ROLES, roleDetails, roleSlug } from '../../shared/roles.js'

const faqs: Array<[string, string]> = [
  [
    'Which roles are open?',
    `Applications are open for ${ROLES.length} roles: Full Stack Developer + Integrations, Admin/Audit Manager, AI Automations, AI Developer, Android/IOS Developer, Voice/Non-Voice Process, Sales & Marketing, HR, Recruiter & Consulting Team, Onboarding Process Team and Customer Support Representative.`,
  ],
  [
    'How do I apply?',
    'Click Apply For Job, pick a role, then click INTERVIEW → on that role card. Create an account or sign in, complete the role-specific form and upload a clear face photo.',
  ],
  [
    'What information is mandatory?',
    'Your full name, email address, phone number, work experience, location, a short description about yourself and a face photo are all required.',
  ],
  [
    'When is my interview scheduled?',
    'As soon as you submit your application, the next day is reserved for you: Virtual Round 1 runs 11:30 AM–11:55 AM IST and Virtual Round 2 runs 12:40 PM–1:10 PM IST. The Zoom buttons appear on your candidate screen automatically.',
  ],
  [
    'Why do I need face verification?',
    'Before each Zoom round, our YOLO person-detection check confirms that exactly one candidate is visible in the camera frame. This keeps the virtual interview genuine and secure.',
  ],
  [
    'How do I join a virtual round?',
    'Click the Zoom link button for the round. Allow camera access, stay alone in frame until the YOLO check passes, and the interview opens automatically. Repeat the same steps for Round 2.',
  ],
  [
    'When does the Boss Round appear?',
    'The Boss Round card is hidden until both Virtual Round 1 and Virtual Round 2 are completed. It is then conducted in person at the Boss location only.',
  ],
  [
    'How do I request the Boss Round?',
    'Once both virtual rounds are complete, a WhatsApp button appears. It opens a pre-written message to +91 7975044149 stating that you are selected for the 3rd Interview.',
  ],
  [
    'When can I access HIRED EMPLOYEE?',
    'The HIRED EMPLOYEE button appears only after the Boss approves your application. It is never shown before approval.',
  ],
  [
    'Where is my application saved?',
    'Your details and photo are saved in this browser and, when the project folder is connected, as a numbered text file in Candidate Applications/Candidates/ and the photo in Candidate Applications/Uploads/.',
  ],
  [
    'Can I use my account on another device?',
    'Accounts are stored in this browser. On a new device, create an account again with the same email. Your project-folder copy is written whenever folder access is connected on that device.',
  ],
  [
    'Is this connected to a live API?',
    'No. The GitHub Pages site runs entirely in your browser, so there is no external authentication API to fail. Passwords are stored only as salted PBKDF2 hashes.',
  ],
]

const steps = [
  {
    icon: BriefcaseBusiness,
    title: '1. Pick a role',
    body: 'Apply For Job takes you to the role list. Every role has its own application page.',
  },
  {
    icon: UserRoundCheck,
    title: '2. Create your account',
    body: 'Create account switches straight to Sign in. Then complete the role form and upload your face photo.',
  },
  {
    icon: CalendarDays,
    title: '3. Get scheduled',
    body: 'The next day is reserved: Round 1 at 11:30 AM and Round 2 at 12:40 PM IST, with Zoom buttons on your screen.',
  },
  {
    icon: ShieldCheck,
    title: '4. Verify your face',
    body: 'Before each Zoom round, the YOLO check confirms exactly one candidate is in frame, then redirects you.',
  },
  {
    icon: CheckCircle2,
    title: '5. Boss Round & hire',
    body: 'After both virtual rounds, request the in-person Boss Round on WhatsApp. HIRED EMPLOYEE unlocks only after approval.',
  },
]

export default function Home() {
  const scrollToRoles = () => {
    document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main>
      <section className="bg-grid-light border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
          <p className="font-mono2 text-xs uppercase tracking-[.3em] text-zara">Careers · Indica Software</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-black leading-[0.95] sm:text-7xl">
            YOUR NEXT ROLE
            <br />
            <span className="text-zara">STARTS HERE.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
            Apply for a role, meet ZARA AI, complete two virtual rounds and earn your place at Indica Software.
            Every role has its own application page and interview schedule.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={scrollToRoles}
              className="inline-flex items-center gap-2 bg-zara px-6 py-3 font-mono2 text-xs uppercase tracking-widest text-white hover:bg-ink"
            >
              Apply For Job <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('interview-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3 font-mono2 text-xs uppercase tracking-widest hover:border-zara hover:text-zara"
            >
              <CalendarDays className="h-4 w-4" /> Interview schedule
            </button>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-px border border-ink/15 bg-ink/15 text-left sm:grid-cols-3">
            <div className="bg-paper p-5">
              <Video className="h-5 w-5 text-zara" />
              <b className="mt-3 block">Virtual Round 1</b>
              <p className="text-sm text-ink/60">11:30 AM–11:55 AM IST</p>
            </div>
            <div className="bg-paper p-5">
              <Video className="h-5 w-5 text-zara" />
              <b className="mt-3 block">Virtual Round 2</b>
              <p className="text-sm text-ink/60">12:40 PM–1:10 PM IST</p>
            </div>
            <div className="bg-paper p-5">
              <MapPin className="h-5 w-5 text-zara" />
              <b className="mt-3 block">Boss Round</b>
              <p className="text-sm text-ink/60">In person at the Boss location</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="font-mono2 text-xs uppercase tracking-[.24em] text-zara">How it works</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">FROM APPLICATION TO HIRED.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <div key={step.title} className="border border-ink/15 bg-paper p-5">
                <step.icon className="h-6 w-6 text-zara" />
                <h3 className="mt-4 font-black">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="scroll-mt-24 bg-grid-light border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono2 text-xs uppercase tracking-[.24em] text-zara">Open positions</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">PICK A ROLE</h2>
              <p className="mt-2 text-ink/60">Each position opens its own application page. Click INTERVIEW → to begin.</p>
            </div>
            <p className="font-mono2 text-xs uppercase tracking-[.18em] text-ink/45">{ROLES.length} roles hiring</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {ROLES.map((role) => {
              const details = roleDetails(role)
              return (
                <article key={role} className="flex flex-col justify-between border border-ink/15 bg-paper p-5 transition-colors hover:border-zara">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">{details.department}</span>
                      <span className="h-1 w-1 rounded-full bg-ink/25" />
                      <span className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-ink/45">Indica Software</span>
                    </div>
                    <h3 className="mt-2 text-xl font-black leading-tight">{role}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/60">{details.blurb}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {details.tags.map((tag: string) => (
                        <span key={tag} className="border border-ink/10 bg-white px-2 py-1 font-mono2 text-[9px] uppercase tracking-[0.12em] text-ink/55">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
                    <span className="text-xs text-ink/45">Virtual rounds + Boss Round</span>
                    <Link
                      to={`/apply/${roleSlug(role)}`}
                      className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-zara"
                    >
                      INTERVIEW <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="interview-schedule" className="scroll-mt-24 border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="font-mono2 text-xs uppercase tracking-[.24em] text-zara">Interview process</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">YOUR INTERVIEW DAY.</h2>
          <p className="mt-2 max-w-2xl text-ink/60">
            Interviews are scheduled automatically for the next day after you submit. Both virtual rounds use Zoom;
            the Boss Round is in person only.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="border border-ink/15 bg-paper p-6">
              <span className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Virtual · Zoom</span>
              <h3 className="mt-2 text-xl font-black">Round 1</h3>
              <p className="mt-2 text-sm text-ink/60">11:30 AM – 11:55 AM IST</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/55">
                YOLO face verification opens first. Once exactly one candidate is detected, the Zoom interview opens automatically.
              </p>
            </div>
            <div className="border border-ink/15 bg-paper p-6">
              <span className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Virtual · Zoom</span>
              <h3 className="mt-2 text-xl font-black">Round 2</h3>
              <p className="mt-2 text-sm text-ink/60">12:40 PM – 1:10 PM IST</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/55">
                Unlocks after Round 1 is completed. The same YOLO face verification runs before the Round 2 Zoom link.
              </p>
            </div>
            <div className="border border-zara/30 bg-red-50/40 p-6">
              <span className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">In person · Boss location</span>
              <h3 className="mt-2 text-xl font-black">Boss Round</h3>
              <p className="mt-2 text-sm text-ink/60">After both virtual rounds</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/55">
                The Boss Round card stays hidden until Round 1 and Round 2 are complete. Request it on WhatsApp, then
                meet the Boss in person.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="font-mono2 text-xs uppercase tracking-[.24em] text-zara">What you need</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">READY TO APPLY?</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Full name and a valid email address',
              'Phone number and current location',
              'Work experience and a short introduction',
              'A clear face photo (JPEG, PNG or WebP)',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border border-ink/15 bg-white p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={scrollToRoles}
            className="mt-8 inline-flex items-center gap-2 bg-zara px-6 py-3 font-mono2 text-xs uppercase tracking-widest text-white hover:bg-ink"
          >
            Apply For Job <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-4xl px-5 py-16">
          <p className="font-mono2 text-xs uppercase tracking-[.24em] text-zara">Answers</p>
          <h2 className="mt-2 text-3xl font-black">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="mt-7 space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="border border-ink/15 bg-paper p-4">
                <summary className="cursor-pointer font-bold">{question}</summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
