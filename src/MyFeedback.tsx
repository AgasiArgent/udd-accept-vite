import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Report { id: number; title: string; status: string; createdAt: string }

export default function MyFeedback() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/feedback')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { reports: Report[] }) => setReports(d.reports))
      .catch(() => setError(true))
  }, [])

  return (
    <main className="wrap">
      <header className="bar">
        <h1>My feedback</h1>
        <Link to="/">Back to cart</Link>
      </header>
      {error && <p role="alert" className="error">Reports are unavailable right now.</p>}
      {!error && reports === null && <p>Loading...</p>}
      {reports?.length === 0 && <p>You have not sent any reports yet.</p>}
      <ul>
        {reports?.map((r) => (
          <li key={r.id}>
            {r.title} <strong>{r.status}</strong> <small>{new Date(r.createdAt).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>
    </main>
  )
}
