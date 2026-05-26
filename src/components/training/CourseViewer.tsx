import { ModuleProgress } from './ModuleProgress'
import { LessonRenderer } from './LessonRenderer'
import { QuizRenderer } from './QuizRenderer'
import { NodeMapWorkshop } from '@/components/workshops/NodeMapWorkshop'
import { SortingWorkshop } from '@/components/workshops/SortingWorkshop'
import { DecisionTreeWorkshop } from '@/components/workshops/DecisionTreeWorkshop'
import { HotspotWorkshop } from '@/components/workshops/HotspotWorkshop'
import type { LessonContent, QuizContent } from '@/types/course.types'
import type { Module } from '@/types/course.types'
import type { ModuleCompletePayload } from '@/types/training.types'
import type { WorkshopContent } from '@/types/workshop.types'

interface CourseViewerProps {
  modules: Module[]
  currentIndex: number
  completedIndices: Set<number>
  moduleComplete: boolean
  onModuleComplete: (payload: ModuleCompletePayload) => void
  onReviewLesson: (moduleIndex: number) => void
}

export function CourseViewer({
  modules,
  currentIndex,
  completedIndices,
  moduleComplete,
  onModuleComplete,
  onReviewLesson,
}: CourseViewerProps) {
  const module = modules[currentIndex]
  if (!module) return null

  const renderModule = () => {
    switch (module.type) {
      case 'lesson':
        return (
          <LessonRenderer
            content={module.content as unknown as LessonContent}
            onComplete={() => onModuleComplete({ score: 100, passed: true })}
          />
        )
      case 'quiz':
        return (
          <QuizRenderer
            content={module.content as unknown as QuizContent}
            onComplete={(score, passed) => onModuleComplete({ score, passed })}
          />
        )
      case 'workshop': {
        const wc = module.content as unknown as WorkshopContent
        switch (wc.workshop_type) {
          case 'node_map':
            return (
              <NodeMapWorkshop
                content={wc}
                onComplete={() => onModuleComplete({ score: 100, passed: true })}
              />
            )
          case 'sorting':
            return (
              <SortingWorkshop
                content={wc}
                modules={modules}
                onComplete={onModuleComplete}
                onReviewLesson={onReviewLesson}
              />
            )
          case 'decision_tree':
            return (
              <DecisionTreeWorkshop
                content={wc}
                onComplete={() => onModuleComplete({ score: 100, passed: true })}
              />
            )
          case 'hotspot':
            return (
              <HotspotWorkshop
                content={wc}
                onComplete={() => onModuleComplete({ score: 100, passed: true })}
              />
            )
          default:
            return <p>Unknown workshop type</p>
        }
      }
      default:
        return null
    }
  }

  const showWorkshopHint =
    module.type === 'workshop' &&
    (module.content as WorkshopContent).workshop_type === 'node_map' &&
    !moduleComplete

  return (
    <div className="grid lg:grid-cols-[minmax(0,240px)_1fr] gap-4 lg:gap-6">
      <aside className="lg:sticky lg:top-4 lg:self-start -mx-1 lg:mx-0">
        <ModuleProgress
          modules={modules}
          currentIndex={currentIndex}
          completedIndices={completedIndices}
        />
      </aside>
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4">{module.title}</h2>
        {renderModule()}
        {showWorkshopHint && (
          <p className="text-sm text-muted-foreground mt-4">
            Complete all map alerts to continue.
          </p>
        )}
      </div>
    </div>
  )
}
