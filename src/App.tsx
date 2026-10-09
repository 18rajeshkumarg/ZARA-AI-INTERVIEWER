import { useState } from 'react'
import Landing from './components/Landing'
import InterviewRoom, { type AnswerRecord } from './components/InterviewRoom'
import FinalRound from './components/FinalRound'
import Report from './components/Report'

// Flow: landing → screening round (online) → real interview (online)
//       → final round is offline one-on-one → report.
type Stage = 'landing' | 'screening' | 'final' | 'offline' | 'report'

export default function App() {
  const [stage, setStage] = useState<Stage>('landing')
  const [roleIdx, setRoleIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])

  const scrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const start = (role: number) => {
    setRoleIdx(role)
    setAnswers([])
    setStage('screening')
    scrollTop()
  }

  const goHome = () => {
    setStage('landing')
    setAnswers([])
    scrollTop()
  }

  return (
    <>
      {stage === 'landing' && <Landing onStart={start} />}

      {stage === 'screening' && (
        <InterviewRoom
          roleIdx={roleIdx}
          round="screening"
          onExit={goHome}
          onHome={goHome}
          onFinish={() => {
            // Screening done — proceed to the real interview.
            setStage('final')
            scrollTop()
          }}
        />
      )}

      {stage === 'final' && (
        <InterviewRoom
          roleIdx={roleIdx}
          round="final"
          onExit={goHome}
          onHome={goHome}
          onFinish={(a) => {
            // Real interview done — announce the offline final round.
            setAnswers(a)
            setStage('offline')
            scrollTop()
          }}
        />
      )}

      {stage === 'offline' && (
        <FinalRound
          roleIdx={roleIdx}
          onContinue={() => {
            setStage('report')
            scrollTop()
          }}
          onHome={goHome}
        />
      )}

      {stage === 'report' && (
        <Report
          roleIdx={roleIdx}
          answers={answers}
          onRestart={goHome}
          onHome={goHome}
        />
      )}
    </>
  )
}
