export type Dim = 'structure' | 'vocab' | 'fluency' | 'confidence'

export interface ScoreMap {
  structure?: number
  vocab?: number
  fluency?: number
  confidence?: number
}

export interface AnswerOption {
  text: string
  feedback: string
  scores: ScoreMap
  kw: string[]
}

export interface Question {
  q: string
  answers: AnswerOption[]
}

export interface RoleDef {
  id: string
  title: string
  level: string
  duration: string
  keywords: string[]
  questions: Question[]
}

export interface Candidate {
  id: string
  name: string
  title: string
  years: number
  city: string
  country: string
  countryCode: string
  tz: string
  initials: string
}

export const candidates: Candidate[] = [
  { id: 'c1', name: 'Amara Okafor', title: 'Frontend Engineer', years: 6, city: 'Lagos', country: 'Nigeria', countryCode: 'NG', tz: 'Africa/Lagos', initials: 'AO' },
  { id: 'c2', name: 'Yuki Tanaka', title: 'Product Designer', years: 8, city: 'Tokyo', country: 'Japan', countryCode: 'JP', tz: 'Asia/Tokyo', initials: 'YT' },
  { id: 'c3', name: 'Priya Sharma', title: 'Product Manager', years: 7, city: 'Bengaluru', country: 'India', countryCode: 'IN', tz: 'Asia/Kolkata', initials: 'PS' },
  { id: 'c4', name: 'Diego Fernández', title: 'Frontend Engineer', years: 5, city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', tz: 'America/Argentina/Buenos_Aires', initials: 'DF' },
  { id: 'c5', name: 'Sofia Rossi', title: 'Data Scientist', years: 6, city: 'Milan', country: 'Italy', countryCode: 'IT', tz: 'Europe/Rome', initials: 'SR' },
  { id: 'c6', name: 'Omar Haddad', title: 'Product Manager', years: 9, city: 'Dubai', country: 'UAE', countryCode: 'AE', tz: 'Asia/Dubai', initials: 'OH' },
]

export const roles: RoleDef[] = [
  {
    id: 'frontend',
    title: 'Frontend Engineer',
    level: 'Senior · React / TypeScript',
    duration: '20 min',
    keywords: ['React', 'TypeScript', 'state management', 'performance', 'testing', 'accessibility'],
    questions: [
      {
        q: 'Tell me about a time you debugged a complex bug in production. What exactly did you investigate?',
        answers: [
          {
            text: 'I reproduced the issue with request logging, bisected the deploy with feature flags, and added a regression test so it could never silently return.',
            feedback: 'Excellent — you showed a full debugging methodology: reproduction, isolation, and prevention through regression testing.',
            scores: { structure: 20, vocab: 18, fluency: 19, confidence: 19 },
            kw: ['testing'],
          },
          {
            text: 'I refreshed the page a couple of times and then fixed it. Sometimes these things just go away.',
            feedback: 'This answer lacks a structured approach — we could not see how you would investigate a bug that does not resolve itself.',
            scores: { structure: 6, vocab: 4, fluency: 8, confidence: 5 },
            kw: [],
          },
          {
            text: 'I looked through the console, found an error, and patched the code directly. It is usually something small.',
            feedback: 'Partial credit — jumping straight to a code patch skips root-cause analysis and would be risky in a shared production system.',
            scores: { structure: 11, vocab: 9, fluency: 12, confidence: 11 },
            kw: [],
          },
        ],
      },
      {
        q: 'How do you approach state management in a large React application?',
        answers: [
          {
            text: 'I start with keeping state local and colocated, then introduce Zustand or Redux Toolkit slices only where state is truly global. I also normalize data so components stay predictable.',
            feedback: 'Strong architectural thinking — you reasoned from colocation upward and mentioned normalization, which scales well to large apps.',
            scores: { structure: 19, vocab: 20, fluency: 18, confidence: 18 },
            kw: ['React', 'state management'],
          },
          {
            text: 'I probably use useState for everything and pass props down. It works as long as the team is small.',
            feedback: 'This will not scale — deeply nested prop trees create maintenance burden. We would probe how you would learn this the hard way.',
            scores: { structure: 5, vocab: 5, fluency: 9, confidence: 6 },
            kw: ['React'],
          },
          {
            text: 'I let the team pick whatever state library everyone is comfortable with, and we figure it out as we go.',
            feedback: 'A pragmatic answer, but it signals you defer architectural decisions. A senior role expects you to drive the technical trade-off.',
            scores: { structure: 12, vocab: 10, fluency: 13, confidence: 10 },
            kw: ['state management'],
          },
        ],
      },
      {
        q: 'Explain the JavaScript event loop — where does asynchronous code fit in?',
        answers: [
          {
            text: 'The call stack runs synchronous code first. When it hits an async operation, the callback goes into the microtask queue or macrotask queue, and the stack clears before those run. Microtasks like Promises flush before render and before macrotasks like setTimeout.',
            feedback: 'A precise, well-ordered explanation — you covered the call stack, both queues, and the microtask/macrotask ordering, which trips up many mid-level devs.',
            scores: { structure: 20, vocab: 19, fluency: 20, confidence: 19 },
            kw: ['TypeScript'],
          },
          {
            text: 'The event loop just keeps running requests like a traffic controller. Async code runs when it needs to.',
            feedback: 'Too high level — we need evidence you understand execution order, e.g. why promise callbacks run before setTimeout callbacks.',
            scores: { structure: 7, vocab: 6, fluency: 9, confidence: 7 },
            kw: [],
          },
          {
            text: 'Async/await is basically syntax over promises, and the event loop schedules everything, so I do not need to think about it day to day.',
            feedback: 'Partially correct but dismissive — a senior engineer should know enough to reason about the loop when debugging.',
            scores: { structure: 12, vocab: 11, fluency: 13, confidence: 11 },
            kw: [],
          },
        ],
      },
      {
        q: 'Walk me through a project you built end to end. How did you plan and ship it?',
        answers: [
          {
            text: 'We planned in weekly sprints, broke the scope into walking-skeleton slices, and I owned both the FE and API work. Before shipping I profiled the bundle, fixed our top accessibility violations, and ran load tests against the staging environment.',
            feedback: 'Great ownership and delivery focus — mentioning performance budgeting, accessibility, and load testing shows you think about production, not just the demo.',
            scores: { structure: 19, vocab: 18, fluency: 19, confidence: 20 },
            kw: ['performance', 'accessibility'],
          },
          {
            text: 'We started coding and used Slack to figure out the rest. The project shipped, mostly on the last minute.',
            feedback: 'Ad-hoc delivery is a red flag for senior scope — expect questions about risk management and how you would prevent crunch time.',
            scores: { structure: 5, vocab: 5, fluency: 10, confidence: 6 },
            kw: [],
          },
          {
            text: 'I focused on the frontend and collaborated daily with backend. We shipped after iterating on feedback from users in beta.',
            feedback: 'Reasonable collaboration story — strengthening it with concrete metrics, e.g. how beta feedback changed priority, would have made it senior-level.',
            scores: { structure: 13, vocab: 10, fluency: 13, confidence: 12 },
            kw: ['performance'],
          },
        ],
      },
      {
        q: 'How do you keep a React codebase maintainable as it grows?',
        answers: [
          {
            text: 'I enforce TypeScript strictness and domain types at the service boundary, colocate tests with components, set lint rules that flag context overuse, and schedule quarterly architecture reviews to decide what deserves its own slice.',
            feedback: 'Excellent — you coupled conventions to tooling and described a governance cadence, which is exactly what keeps large codebases healthy.',
            scores: { structure: 20, vocab: 20, fluency: 18, confidence: 19 },
            kw: ['TypeScript', 'testing'],
          },
          {
            text: 'I try not to touch other teams\u2019s code and add comments where I make changes.',
            feedback: 'Comments alone do not maintain a codebase — this suggests you have not yet systematized any of the surrounding guardrails.',
            scores: { structure: 6, vocab: 5, fluency: 8, confidence: 6 },
            kw: [],
          },
          {
            text: 'I refactor as I go — small cleanups whenever I am already in a file. Plus I use code review to catch the obvious things.',
            feedback: 'Good continuous-improvement instinct, but drive-by refactoring plus review is passive. Consider proactive, scoped refactors to pay down debt.',
            scores: { structure: 13, vocab: 11, fluency: 13, confidence: 12 },
            kw: ['TypeScript'],
          },
        ],
      },
    ],
  },
  {
    id: 'pm',
    title: 'Product Manager',
    level: 'Senior · Growth',
    duration: '20 min',
    keywords: ['prioritization', 'metrics', 'stakeholder', 'launch', 'roadmap', 'discovery'],
    questions: [
      {
        q: 'How do you prioritize a product backlog when everything is urgent?',
        answers: [
          {
            text: 'I score items by impact on a single north-star metric, then by effort, and I timebox investigation of anything that blocks the top items. I also explicitly say no to work that does not move the needle.',
            feedback: 'A disciplined, principled framework — tying priority to one north-star metric and explicit trade-offs is senior PM behavior.',
            scores: { structure: 20, vocab: 19, fluency: 18, confidence: 19 },
            kw: ['prioritization', 'roadmap'],
          },
          {
            text: 'I take the requests in the order they come, because stakeholders get upset when things sit in the queue.',
            feedback: 'Meeting stakeholders in queue order is not prioritization — it is reacting to the loudest voice, not the highest impact.',
            scores: { structure: 5, vocab: 6, fluency: 9, confidence: 6 },
            kw: [],
          },
          {
            text: 'I hold weekly triage meetings and use a simple interest-vs-effort matrix to sort things. Then I communicate the top three to the team.',
            feedback: 'A solid lightweight process — we would push on how that matrix connects to business outcomes rather than just stakeholder preference.',
            scores: { structure: 14, vocab: 11, fluency: 13, confidence: 12 },
            kw: ['prioritization'],
          },
        ],
      },
      {
        q: 'Tell me about a time you changed direction on a feature mid-development. What triggered it and what did you do?',
        answers: [
          {
            text: 'Our activation data showed users bounced on the invite step. We cut the launch two weeks, ran a five-person usability session, redesigned the funnel, and re-launched — retention improved 18% and stakeholders thanked us for saying no.',
            feedback: 'This is a model answer — data-triggered pivot, a time-boxed learning plan, and measured impact. Strong senior ownership.',
            scores: { structure: 19, vocab: 18, fluency: 19, confidence: 20 },
            kw: ['metrics', 'discovery'],
          },
          {
            text: 'Stakeholders asked for changes so often that the feature just kept evolving until launch was almost postponed.',
            feedback: 'This describes a failure to protect scope. They are probing whether you own ambiguity or get steamrolled by it.',
            scores: { structure: 7, vocab: 6, fluency: 10, confidence: 7 },
            kw: [],
          },
          {
            text: 'I aligned with leadership early, defined what would count as a success criterion, and then executed — the direction changed once and I evaluated it against that criterion.',
            feedback: 'Decent plan-driven approach, though it tracks closer to delivery management. Sharpen how you balance the plan with customer learning.',
            scores: { structure: 13, vocab: 11, fluency: 14, confidence: 13 },
            kw: ['metrics'],
          },
        ],
      },
      {
        q: 'How do you define success metrics for a product launch?',
        answers: [
          {
            text: 'I define a baseline from existing data, pick one primary metric tied to the core value moment, plus two guardrail metrics so we can trust the primary one. We review them with engineering before launch, not after.',
            feedback: 'Exactly right — primary metric plus guardrails, baselined before launch, reviewed cross-functionally. This is how teams avoid running the wrong experiment.',
            scores: { structure: 20, vocab: 20, fluency: 18, confidence: 19 },
            kw: ['metrics', 'launch'],
          },
          {
            text: 'We just look at signups and conversions. If those go up, it was a good launch.',
            feedback: 'Signups are a vanity number for launches — a senior PM separates healthy acquisition from a spike that washes out in retention.',
            scores: { structure: 6, vocab: 6, fluency: 8, confidence: 6 },
            kw: ['launch'],
          },
          {
            text: 'I ask the team what they think will move and we track whatever feels important, reviewed in a launch retrospective.',
            feedback: 'Retrospective-driven metrics are too late to steer — meaning-making should happen before you ship, with engineering aligned on the instrumentation.',
            scores: { structure: 11, vocab: 10, fluency: 13, confidence: 10 },
            kw: ['metrics'],
          },
        ],
      },
      {
        q: 'Describe a conflict with engineering and how you resolved it.',
        answers: [
          {
            text: 'I wanted a feature before the migration was done; the team said it would double the risk. Instead of escalating, I brought them the user data and a stepped rollout, they scoped a minimal viable path, and we shipped both in sequence with clear owners.',
            feedback: 'You resolved it through shared evidence and sequencing rather than politics — exactly how a senior PM builds trust with technical partners.',
            scores: { structure: 19, vocab: 18, fluency: 18, confidence: 19 },
            kw: ['stakeholder'],
          },
          {
            text: 'I was frustrated with their estimate so I introduced myself to the director and asked for a re-scope. They complied.',
            feedback: 'You bypassed the team instead of resolving the concern. Escalation can be a last resort — senior PMs first understand why estimates diverge.',
            scores: { structure: 6, vocab: 6, fluency: 9, confidence: 8 },
            kw: [],
          },
          {
            text: 'We disagreed on a trade-off and we ran a two-week spike to get real data on both options, then decided with that.',
            feedback: 'Good evidence-driven conflict resolution. Adding how you kept the two-week spike timeboxed and communicated to stakeholders would make it stronger.',
            scores: { structure: 14, vocab: 11, fluency: 13, confidence: 13 },
            kw: ['discovery'],
          },
        ],
      },
      {
        q: 'What does a world-class product manager do that others do not?',
        answers: [
          {
            text: 'I spend time writing and sharpening the problem statement before asking for solutions — forcing clarity on the outcome rather than the tactic. I also make it easy for everyone to reason about the important numbers at any moment.',
            feedback: 'A thoughtful, practitioner answer — problem framing and shared quantitative literacy separate senior PMs from order-takers.',
            scores: { structure: 20, vocab: 18, fluency: 18, confidence: 19 },
            kw: ['discovery', 'metrics'],
          },
          {
            text: 'I write good PRDs and coordinate the launch plan. Many PMs cannot do those things well.',
            feedback: 'Listing deliverables describes execution, not judgment. A stronger answer would show how you shape strategy and align stakeholders.',
            scores: { structure: 9, vocab: 8, fluency: 12, confidence: 9 },
            kw: [],
          },
          {
            text: 'I mostly keep teams unblocked and make sure work gets done on time.',
            feedback: 'That is an important job, but it is delivery management — we want to see how you set product vision, not just keep the trains running.',
            scores: { structure: 8, vocab: 7, fluency: 11, confidence: 8 },
            kw: [],
          },
        ],
      },
    ],
  },
  {
    id: 'design',
    title: 'Product Designer',
    level: 'Senior · Platform',
    duration: '20 min',
    keywords: ['process', 'figma', 'design system', 'research', 'accessibility', 'iteration'],
    questions: [
      {
        q: 'How do you move from exploration to a shipped design?',
        answers: [
          {
            text: 'I timebox exploration with explicit risk hypotheses, validate the riskiest assumption first with low-fidelity work, then commit to a direction. Design reviews happen early and often, with engineers co-owning implementation decisions.',
            feedback: 'Excellent process discipline — risk-hypothesis exploration and early engineer co-ownership are hallmarks of a senior designer.',
            scores: { structure: 19, vocab: 18, fluency: 18, confidence: 19 },
            kw: ['process', 'research'],
          },
          {
            text: 'I browse Dribbble until I feel stuck, then open Figma. If the design review goes badly, I start over.',
            feedback: 'Unstructured ideation is not a process — we need to see how you reduce ambiguity before committing to a direction.',
            scores: { structure: 5, vocab: 5, fluency: 9, confidence: 6 },
            kw: ['figma'],
          },
          {
            text: 'I do a quick prototype, show it to the PM, adjust, and eventually hand off specs. Feedback comes in batches before launch.',
            feedback: 'Reasonable flow, but batch feedback late in the cycle is expensive to fix — a senior designer de-risks by moving reviews earlier.',
            scores: { structure: 12, vocab: 10, fluency: 13, confidence: 11 },
            kw: ['figma'],
          },
        ],
      },
      {
        q: 'Tell me about a time you fought for a design decision. What was the outcome?',
        answers: [
          {
            text: 'We wanted to break a design system component for a unique interaction. I argued for a composition of primitives instead — it kept the accessibility audit and two-month migration of repos intact. Leadership backed me because I framed it as risk, not preference.',
            feedback: 'Persuasive — you defended a decision with engineering and brand risk in mind, which is how strong design leadership wins.',
            scores: { structure: 20, vocab: 18, fluency: 18, confidence: 20 },
            kw: ['design system'],
          },
          {
            text: 'I made my case and eventually the other person won. I adapted the design.',
            feedback: 'Adapting is fine, but this answer shows no persistence or evidence-gathering — it reads as a capitulation, not a negotiated outcome.',
            scores: { structure: 7, vocab: 6, fluency: 9, confidence: 8 },
            kw: [],
          },
          {
            text: 'I built a prototype to demonstrate the trade-off and the engineer softened quickly when they saw it working.',
            feedback: 'Convincing evidence-over-argument is a great instinct — combining it with a clear design system rationale would have made it even stronger.',
            scores: { structure: 14, vocab: 11, fluency: 13, confidence: 13 },
            kw: ['design system'],
          },
        ],
      },
      {
        q: 'How do you handle feedback about your work?',
        answers: [
          {
            text: 'I ask what problem the feedback solves, separate taste from evidence, and keep a written iteration log. I also try to give feedback back — especially to designers whose work solved something I could not.',
            feedback: 'Mature feedback culture habits — asking for the underlying problem and reciprocating feedback elevate you from good to senior.',
            scores: { structure: 18, vocab: 17, fluency: 17, confidence: 18 },
            kw: ['process'],
          },
          {
            text: 'I take it all at once and redo the whole piece. Keeping original work archived in a folder.',
            feedback: 'This approach destroys learning and velocity — targeted iteration against explicit goals is the senior approach.',
            scores: { structure: 6, vocab: 5, fluency: 8, confidence: 6 },
            kw: [],
          },
          {
            text: 'I usually find the 80% of feedback that is constructive and ignore the rest, then focus on my core vision.',
            feedback: 'Selective filtering can be useful, but a blanket ignore of stakeholder feedback tends to surface late as resistance in reviews.',
            scores: { structure: 12, vocab: 10, fluency: 12, confidence: 11 },
            kw: ['iteration'],
          },
        ],
      },
      {
        q: 'How would you design the onboarding flow for a B2C fintech app?',
        answers: [
          {
            text: 'I would start by interviewing ten recent sign-ups to find where they dropped and why, define one activation moment, and use that as our single source of truth. Later I would design for assisted verification as a first-class path, keep accessibility above WCAG AA, and test the prototype with five users before building.',
            feedback: 'A complete, user-grounded answer — research-driven prioritization, a single activation metric, assisted flows, and usability testing before build.',
            scores: { structure: 20, vocab: 19, fluency: 18, confidence: 19 },
            kw: ['research', 'accessibility'],
          },
          {
            text: 'I would copy a three-step wizard because activation benchmarks suggest wizards outperform freeform setup.',
            feedback: 'Benchmarks without understanding your users is cargo-cult design — the reasoning about user behavior matters more than the pattern.',
            scores: { structure: 6, vocab: 6, fluency: 9, confidence: 7 },
            kw: [],
          },
          {
            text: 'I would design a beautiful landing page with gradients, skim the app in parallel, and ship whatever is ready. Design systems give me the components.',
            feedback: 'Polished visuals do not validate a flow — we need to see how you prioritize problems and get evidence early in the process.',
            scores: { structure: 11, vocab: 9, fluency: 13, confidence: 11 },
            kw: ['figma'],
          },
        ],
      },
      {
        q: 'How do you decide when a design is done?',
        answers: [
          {
            text: 'When every explicit requirement and success criterion is met, edge cases are handled, and we have evidence from at least two reviews — not when it feels complete to the author. Then I write the spec and design-system notes so the handoff survives me.',
            feedback: 'Rigorous definition of done with documentation as a responsibility — this is exactly how senior designers make work durable.',
            scores: { structure: 19, vocab: 18, fluency: 17, confidence: 19 },
            kw: ['process', 'design system'],
          },
          {
            text: 'When the client stops responding and nobody complains. That is usually the signal.',
            feedback: 'Using silence as a completion signal leads to scope creep and rework — explicit criteria protect the team.',
            scores: { structure: 5, vocab: 5, fluency: 8, confidence: 6 },
            kw: [],
          },
          {
            text: 'I consider it done after one round of engineering review and a first build. Details will be refined in the next iteration.',
            feedback: 'Deferring to the next iteration can work for discovery-stage work, but for committed product surfaces it ships ambiguity to users.',
            scores: { structure: 12, vocab: 10, fluency: 12, confidence: 11 },
            kw: ['iteration'],
          },
        ],
      },
    ],
  },
  {
    id: 'data',
    title: 'Data Scientist',
    level: 'Senior · Applied ML',
    duration: '20 min',
    keywords: ['experimentation', 'python', 'sql', 'validation', 'communication', 'production'],
    questions: [
      {
        q: 'Walk me through your process when you receive a new dataset. How do you decide what to build?',
        answers: [
          {
            text: 'I profile the data first — completeness, leakage, segment balance — then frame the business question with stakeholders. If a baseline model beats our expectations by a wide margin, the real deliverable is a trusted analysis and a decision framework, not a neural net.',
            feedback: 'A mature, business-first answer — profiling, framing, and knowing when simple baselines win are hallmarks of a senior applied scientist.',
            scores: { structure: 19, vocab: 18, fluency: 18, confidence: 19 },
            kw: ['python', 'sql'],
          },
          {
            text: 'I start building a model right away. Whatever pattern stands out is probably the signal.',
            feedback: 'Jumping to modeling without profiling almost guarantees leakage or a meaningless pattern — we need to see the discipline before the algorithm.',
            scores: { structure: 5, vocab: 5, fluency: 9, confidence: 6 },
            kw: ['python'],
          },
          {
            text: 'I clean the data with a script, run the usual gradient boosting, check the leaderboard, and iterate until the number looks good.',
            feedback: 'Leaderboard-chasing without validation strategy or business framing suggests mid-level, not senior, thinking.',
            scores: { structure: 8, vocab: 8, fluency: 11, confidence: 8 },
            kw: ['python'],
          },
        ],
      },
      {
        q: 'How do you validate a model before shipping it to production?',
        answers: [
          {
            text: 'I use time-based splits matched to the serving distribution, check calibration and slice performance — not just global AUC — run a shadow deployment alongside the current system, and define automated drift and kill-switch alerts before we promote.',
            feedback: 'Outstanding — time-aware validation, slice analysis, shadow deployment, and drift monitoring show you own a model\u2019s lifecycle, not just its training.',
            scores: { structure: 20, vocab: 19, fluency: 18, confidence: 20 },
            kw: ['validation', 'production'],
          },
          {
            text: 'I retrain on the latest data, get a good score on the test set, and ship it. The pipeline reruns automatically.',
            feedback: 'A random test split plus good score is the classic recipe for production surprises — we need to see validation and monitoring rigor.',
            scores: { structure: 6, vocab: 6, fluency: 9, confidence: 7 },
            kw: [],
          },
          {
            text: 'I do cross-validation and compare against the previous model before replacing it. Tests in CI make it safe.',
            feedback: 'Solid foundation — CV and CI regression tests are necessary, but without distribution-matched validation and post-launch monitoring the story is incomplete.',
            scores: { structure: 14, vocab: 11, fluency: 13, confidence: 12 },
            kw: ['validation'],
          },
        ],
      },
      {
        q: 'Tell me about a time your analysis turned out to be wrong. What happened and what changed?',
        answers: [
          {
            text: 'I found a spurious segment pattern using a random split; when finance used a 30-day window, the effect inverted. I documented the failure, rebuilt with a time-based split, and now run a pre-analysis checklist — and I report uncertainty intervals instead of point estimates.',
            feedback: 'A genuinely strong answer — you owned the error, extracted a durable process improvement, and adapted how you communicate.',
            scores: { structure: 19, vocab: 17, fluency: 18, confidence: 20 },
            kw: ['validation'],
          },
          {
            text: 'The chart looked confusing, so I re-made it and the answer became obvious. I think I just needed clearer axes.',
            feedback: 'Framing a modeling mistake as a charting problem is a self-serving story — the signal here is how you investigate discrepancies like this.',
            scores: { structure: 7, vocab: 6, fluency: 10, confidence: 8 },
            kw: [],
          },
          {
            text: 'The experiment result did not replicate, so we discarded it and moved on. No harm done.',
            feedback: 'Discarding is honest, but a senior scientist also investigates why — sample ratio, novelty effects, or a bug — and can salvage partial learning.',
            scores: { structure: 12, vocab: 10, fluency: 12, confidence: 11 },
            kw: ['experimentation'],
          },
        ],
      },
      {
        q: 'How do you communicate insights to non-technical stakeholders?',
        answers: [
          {
            text: 'I translate every deliverable into a decision and a number with a range, I use narrative over dashboards in the meeting, and the written doc works top-down: the recommendation first, with the method appendix for those who want it.',
            feedback: 'This is textbook senior communication — decision-first framing, uncertainty, and layered documentation that serves both executives and reviewers.',
            scores: { structure: 20, vocab: 18, fluency: 18, confidence: 19 },
            kw: ['communication'],
          },
          {
            text: 'I present the full technical writeup and let them figure out what to do with it. Stats aren\u2019t really my audience.',
            feedback: 'A writeup nobody reads helps no one — the skill is meeting the decision-maker at their altitude.',
            scores: { structure: 6, vocab: 6, fluency: 9, confidence: 7 },
            kw: [],
          },
          {
            text: 'I put the numbers in a slide and walk through the charts. Stakeholders always ask good questions.',
            feedback: 'Chart-walking is presentation, not storytelling — we need to see how you drive a decision, including pushing back when the room resists the data.',
            scores: { structure: 11, vocab: 9, fluency: 12, confidence: 10 },
            kw: ['communication'],
          },
        ],
      },
      {
        q: 'Describe your experience operating machine learning models in production.',
        answers: [
          {
            text: 'I own the full loop: scheduled retraining with feature-version consistency checks, champion-challenger rollouts, drift monitors on inputs and outputs, and runbooks so on-call engineers can triage without me. I have paged a model rollback at 3am and the runbook got us back in eleven minutes.',
            feedback: 'This is the definition of production ML ownership — reliability engineering and operational readiness at exactly the senior bar.',
            scores: { structure: 20, vocab: 19, fluency: 18, confidence: 20 },
            kw: ['production'],
          },
          {
            text: 'I have deployed models as notebooks and used cron to retrain them. They run when they run.',
            feedback: 'Notebook-plus-cron pipelines are tomorrow\u2019s incident — there is no monitoring, no versioning discipline, no on-call story.',
            scores: { structure: 5, vocab: 5, fluency: 9, confidence: 6 },
            kw: [],
          },
          {
            text: 'I built a retraining pipeline in Python with tests, and we check accuracy before deploying manually through the team\u2019s process.',
            feedback: 'A tested pipeline plus a manual deploy process is a strong start — the missing pieces are staged rollouts and automated monitoring.',
            scores: { structure: 14, vocab: 11, fluency: 13, confidence: 12 },
            kw: ['python', 'production'],
          },
        ],
      },
    ],
  },
]
