import { ModuleProgress } from './ModuleProgress'
import { LessonRenderer } from './LessonRenderer'
import { QuizRenderer } from './QuizRenderer'
import { NodeMapWorkshop } from '@/components/workshops/NodeMapWorkshop'
import { SortingWorkshop } from '@/components/workshops/SortingWorkshop'
import { DecisionTreeWorkshop } from '@/components/workshops/DecisionTreeWorkshop'
import { HotspotWorkshop } from '@/components/workshops/HotspotWorkshop'
import type { QuizContent } from '@/types/course.types'
import type { Module } from '@/types/course.types'
import type { ModuleCompletePayload } from '@/types/training.types'
import type { WorkshopContent } from '@/types/workshop.types'
import { parseLessonContent } from '@/lib/lesson-content'

interface CourseViewerProps {
  modules: Module[]
  currentIndex: number
  completedIndices: Set<number>
  onModuleComplete: (payload: ModuleCompletePayload) => void
  onReviewLesson: (moduleIndex: number) => void
}

export function CourseViewer({
  modules,
  currentIndex,
  completedIndices,
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
            key={module.id}
            moduleId={module.id}
            content={parseLessonContent(module.content)}
            onComplete={() => onModuleComplete({ score: 100, passed: true })}
          />
        )
      case 'quiz':
        return (
          <QuizRenderer
            key={module.id}
            content={module.content as unknown as QuizContent}
            onComplete={(score, passed) => onModuleComplete({ score, passed })}
          />
        )
      case 'workshop': {
        const wc = module.content as unknown as WorkshopContent
        switch (wc.workshop_type) {
          case 'node_map':
            return (
              <NodeMapWorkshop key={module.id} content={wc} onComplete={onModuleComplete} />
            )
          case 'sorting':
            return (
              <SortingWorkshop
                key={module.id}
                content={wc}
                modules={modules}
                onComplete={onModuleComplete}
                onReviewLesson={onReviewLesson}
              />
            )
          case 'decision_tree':
            return (
              <DecisionTreeWorkshop
                key={module.id}
                content={wc}
                onComplete={() => onModuleComplete({ score: 100, passed: true })}
              />
            )
          case 'hotspot':
            return (
              <HotspotWorkshop
                key={module.id}
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

  return (
    <div className="grid w-full min-w-0 max-w-full lg:grid-cols-[minmax(0,240px)_1fr] gap-4 lg:gap-6">
      <aside className="w-full min-w-0 lg:sticky lg:top-4 lg:self-start">
        <ModuleProgress
          modules={modules}
          currentIndex={currentIndex}
          completedIndices={completedIndices}
        />
      </aside>
      <div className="min-w-0 w-full max-w-full overflow-hidden">
        <h2 className="text-lg sm:text-xl font-bold mb-4 leading-snug break-anywhere">{module.title}</h2>
        {renderModule()}
      </div>
    </div>
  )
}
