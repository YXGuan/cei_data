import { AdminConsole } from '@/components/admin-console'

export default function AdminPage() {
  return (
    <main className="content-page admin-page">
      <section className="page-intro">
        <span className="overline">Restricted workspace</span>
        <h1>Source review and inclusion queue.</h1>
        <p>Only profiles explicitly promoted to the admin role can change review status.</p>
      </section>
      <AdminConsole />
    </main>
  )
}
