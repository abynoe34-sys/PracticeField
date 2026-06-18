import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Practice Field',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-field-dark px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8 text-gray-300">
        <div>
          <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
            ← Back to Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4 mb-1">Terms of Service</h1>
          <p className="text-sm text-gray-500">Effective date: June 17, 2025 · Version 1.0</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Acceptance</h2>
          <p className="text-sm leading-relaxed">
            By creating a workspace on Practice Field you agree to these Terms of Service (&quot;Terms&quot;).
            If you are using Practice Field on behalf of an organization — a team, club, or school —
            you represent that you have authority to bind that organization to these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. The Service</h2>
          <p className="text-sm leading-relaxed">
            Practice Field is a coaching tool for American football. It lets coaches log player
            sessions, track performance metrics, generate AI-assisted training plans, and upload
            practice video clips for technique analysis. The service is provided &quot;as is&quot; and
            is not a substitute for qualified professional coaching, medical, or athletic training advice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Your Coach ID</h2>
          <p className="text-sm leading-relaxed">
            Your Coach ID is the only credential protecting your workspace. Keep it private.
            We cannot recover a lost Coach ID. You are responsible for all activity that occurs
            under your Coach ID.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Player Data and Minors</h2>
          <p className="text-sm leading-relaxed">
            You are responsible for obtaining all necessary consents before adding players to your
            workspace, including parental or guardian consent for players under 18 years of age.
            Do not upload video or personal data for any player who has not consented (or whose
            parent or guardian has not consented).
          </p>
          <p className="text-sm leading-relaxed">
            You must not knowingly collect data on children under 13 without verifiable parental consent
            in compliance with applicable law (including COPPA in the United States).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Video and Content</h2>
          <p className="text-sm leading-relaxed">
            By uploading a video you grant Practice Field a limited, non-exclusive licence to store,
            process, and analyze that video solely to provide you with coaching analysis results.
            We do not sell, share, or use your video content for any other purpose.
            Videos are stored securely and are accessible only through your Coach ID.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6. AI Analysis</h2>
          <p className="text-sm leading-relaxed">
            Technique analysis, training plan recommendations, and other AI-generated outputs are
            informational only. They may contain errors. Always apply professional judgment before
            acting on any recommendation. Practice Field makes no warranty that AI analysis is
            accurate, complete, or suitable for any particular purpose.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">7. Acceptable Use</h2>
          <p className="text-sm leading-relaxed">
            You agree not to upload content that is unlawful, harassing, or violates third-party
            rights. You agree not to attempt to reverse-engineer, scrape, or disrupt the service.
            We reserve the right to terminate access for violations of these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">8. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">
            To the maximum extent permitted by law, Practice Field is not liable for any indirect,
            incidental, or consequential damages arising from your use of the service. Our total
            liability to you for any claim will not exceed the amount you have paid us in the
            twelve months preceding the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">9. Changes</h2>
          <p className="text-sm leading-relaxed">
            We may update these Terms. When we do, we will post the new version here and update
            the effective date. Continued use of Practice Field after a change constitutes acceptance
            of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">10. Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:support@practicefield.app" className="text-brand-400 underline hover:text-brand-300">
              support@practicefield.app
            </a>.
          </p>
        </section>

        <div className="pt-4 border-t border-field-border">
          <Link href="/privacy" className="text-sm text-brand-400 hover:text-brand-300">
            Read our Privacy Policy →
          </Link>
        </div>
      </div>
    </main>
  )
}
