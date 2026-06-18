import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Practice Field',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-field-dark px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8 text-gray-300">
        <div>
          <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
            ← Back to Practice Field
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4 mb-1">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Effective date: June 17, 2025 · Version 1.0</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. What We Collect</h2>
          <p className="text-sm leading-relaxed">
            <strong className="text-white">Coach information:</strong> When you create a workspace we
            generate a unique Coach ID. If you provide a name or email address we store those as well.
            We record the IP address and browser at the time you accept these terms for compliance purposes.
          </p>
          <p className="text-sm leading-relaxed">
            <strong className="text-white">Player information:</strong> Name, position, experience level,
            date of birth (optional), and consent records. We do not collect sensitive health or
            financial information about players.
          </p>
          <p className="text-sm leading-relaxed">
            <strong className="text-white">Session and performance data:</strong> Notes, strengths,
            improvement areas, and numeric metrics you enter through the coaching interface.
          </p>
          <p className="text-sm leading-relaxed">
            <strong className="text-white">Video:</strong> Practice clips you upload, the extracted
            frames used for analysis, and the AI-generated analysis results.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. How We Use It</h2>
          <ul className="text-sm leading-relaxed space-y-1 list-disc list-inside marker:text-gray-500">
            <li>To operate and improve the Practice Field service.</li>
            <li>To generate AI technique analysis and training plan recommendations for your players.</li>
            <li>To maintain the append-only consent audit log required by applicable law.</li>
            <li>To diagnose technical issues and ensure service reliability.</li>
          </ul>
          <p className="text-sm leading-relaxed">
            We do not sell personal data. We do not use player video or personal data to train AI models
            without explicit, separate consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Storage and Security</h2>
          <p className="text-sm leading-relaxed">
            All data is stored in Supabase-hosted databases and object storage located in the United States.
            Access is controlled via your Coach ID and server-side service-role keys — no data is publicly
            accessible without your Coach ID. Video files are stored in private buckets and served only
            through short-lived signed URLs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Children and Minors</h2>
          <p className="text-sm leading-relaxed">
            Practice Field is designed for use by coaches. If a coach adds a player under 18, we require
            the coach to confirm that a parent or legal guardian has consented before any video is uploaded.
            We record parental consent in our audit log. If you believe a minor&apos;s data has been added
            without proper consent, contact us immediately and we will delete it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Consent Records</h2>
          <p className="text-sm leading-relaxed">
            We maintain an immutable append-only log of every consent event (when you accepted these
            policies, when player consent was recorded, when parental consent was granted). These records
            cannot be deleted and are retained for as long as the relevant coaching workspace exists.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6. Sharing</h2>
          <p className="text-sm leading-relaxed">
            We share data only with the sub-processors required to run the service (Supabase for
            database/storage; Anthropic for AI analysis). Each sub-processor is bound by data protection
            obligations. We will disclose data if required by law or to protect our legal rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">7. Retention and Deletion</h2>
          <p className="text-sm leading-relaxed">
            Player data and videos are retained as long as the coaching workspace is active. To delete
            a player&apos;s data, remove the player from your workspace — this cascades to delete all
            associated sessions, videos, and training plans. To delete an entire workspace, contact us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">8. Your Rights</h2>
          <p className="text-sm leading-relaxed">
            Depending on your jurisdiction you may have rights to access, correct, or delete personal
            data we hold about you or your players. To exercise these rights, contact us at the address
            below and we will respond within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">9. Changes</h2>
          <p className="text-sm leading-relaxed">
            We may update this Privacy Policy. Material changes will be reflected in the version number
            and effective date at the top of this page. Continued use of Practice Field after a change
            constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">10. Contact</h2>
          <p className="text-sm leading-relaxed">
            Privacy questions or requests:{' '}
            <a href="mailto:privacy@practicefield.app" className="text-brand-400 underline hover:text-brand-300">
              privacy@practicefield.app
            </a>
          </p>
        </section>

        <div className="pt-4 border-t border-field-border">
          <Link href="/terms" className="text-sm text-brand-400 hover:text-brand-300">
            Read our Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  )
}
