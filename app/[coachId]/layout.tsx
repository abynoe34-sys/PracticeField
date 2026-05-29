import Navigation from '@/components/Navigation'

export default async function CoachLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ coachId: string }>
}) {
  const { coachId } = await params
  return (
    <div className="min-h-screen bg-field-dark">
      <Navigation coachId={coachId} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
