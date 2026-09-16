import { useState } from 'react'
import Landing from './components/Landing'
import InterviewRoom, { type AnswerRecord } from './components/InterviewRoom'
import Report from './components/Report'

type Stage = 'landing' | 'interview' | 'report'

export default function App() {
  const [stage, setStage] = useState<Stage>('landing')
  const [roleIdx, setRoleIdx] = useState(0)
  const [candIdx, setCandIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])

  const start = (role: number, cand: number) => {
    setRoleIdx(role)
    setCandIdx(cand)
    setAnswers([])
    setStage('interview')
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  return (
    <>
      {stage === 'landing' && <Landing onStart={start} onPick={(r, c) => start(r, c)} />}
      {stage === 'interview' && (
        <InterviewRoom
          roleIdx={roleIdx}
          candIdx={candIdx}
          onExit={() => setStage('landing')}
          onFinish={(a) => {
            setAnswers(a)
            setStage('report')
            if (typeof window !== 'undefined') window.scrollTo(0, 0)
          }}
        />
      )}
      {stage === 'report' && (
        <Report
          roleIdx={roleIdx}
          candIdx={candIdx}
          answers={answers}
          onRestart={() => setStage('landing')}
        />
      )}
    </>
  )
}
