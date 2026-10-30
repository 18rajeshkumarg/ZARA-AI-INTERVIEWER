import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Home from './Home'
import RoleApplication from './RoleApplication'
import Shell from './Shell'

export default function Landing() {
  const { roleId } = useParams()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/roles') return
    const timer = window.setTimeout(() => {
      document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  if (roleId) return <RoleApplication />

  return (
    <Shell>
      <Home />
    </Shell>
  )
}
