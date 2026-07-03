import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { olStanceAnalysis } from '@/lib/jobs/ol-stance-analysis'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [olStanceAnalysis],
})
