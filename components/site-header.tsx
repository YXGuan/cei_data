import Link from 'next/link'
import { Code2, Database, LockKeyhole } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/">
        <span className="wordmark-icon"><Database size={17} /></span>
        <span><strong>CEI</strong> AI Governance Source Matrix</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/">Source matrix</Link>
        <Link href="/sources">Review sources</Link>
        <Link href="/methodology">Methodology</Link>
      </nav>
      <div className="header-actions">
        <a aria-label="CEI source repositories" href="https://github.com/cjimmylin" rel="noreferrer" target="_blank">
          <Code2 size={16} />
        </a>
        <Link className="admin-link" href="/admin"><LockKeyhole size={14} /> Admin</Link>
      </div>
    </header>
  )
}
