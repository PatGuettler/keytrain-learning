import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SAMPLE_VIDEOS = [
  {
    id: 'overview',
    title: 'KeyTrain Learning overview',
    description:
      'A quick tour of the portal — training assignments, dashboards, and how staff and managers use KTL day to day.',
    duration: '3:24',
  },
  {
    id: 'phishing',
    title: 'Running a phishing simulation',
    description:
      'See how admins launch a campaign, track clicks, and follow up with targeted lessons for your team.',
    duration: '4:12',
  },
  {
    id: 'railnet',
    title: 'RailNet reports for leaders',
    description:
      'How org leaders review anonymized security trends from KeyTrain desktop hosts and export leadership-ready reports.',
    duration: '5:08',
  },
] as const

function VideoPlaceholder({
  title,
  duration,
}: {
  title: string
  duration: string
}) {
  return (
    <div
      className="relative flex aspect-video w-full items-center justify-center rounded-lg border bg-muted/50"
      aria-label={`Video placeholder: ${title}`}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border bg-background shadow-sm">
          <Play className="h-6 w-6 fill-current ml-0.5" aria-hidden />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide">Sample video</span>
      </div>
      <span className="absolute bottom-3 right-3 rounded bg-background/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {duration}
      </span>
    </div>
  )
}

export function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-2xl mb-12">
        <p className="text-sm font-medium text-primary mb-3">How it works</p>
        <h1 className="text-4xl font-bold tracking-tight">See KeyTrain in action</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Short walkthrough videos for admins, managers, and security leads. Replace these placeholders
          with your own recordings when you are ready.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-1">
        {SAMPLE_VIDEOS.map(({ id, title, description, duration }) => (
          <Card key={id} className="overflow-hidden">
            <div className="p-6 pb-0 sm:p-8 sm:pb-0">
              <VideoPlaceholder title={title} duration={duration} />
            </div>
            <CardHeader>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Video coming soon — this is a placeholder for your hosted recording.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 rounded-xl border bg-muted/20 p-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Ready to get started?</h2>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          Request access for your organization or sign in if you already have an account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/signup">Get started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
