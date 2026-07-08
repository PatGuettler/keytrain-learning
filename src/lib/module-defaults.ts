import type { LessonContent, Module, QuizContent } from '@/types/course.types'
import type {
  DecisionTreeConfig,
  HotspotConfig,
  NodeMapConfig,
  SortingConfig,
  WorkshopContent,
  WorkshopType,
} from '@/types/workshop.types'

const selectLayouts = [
  'content-only',
  'image-right',
  'image-left',
  'image-top',
  'full-bleed',
  'image-only',
] as const

export function newSlideId(): string {
  return `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function newQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function newNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function defaultLessonContent(): LessonContent {
  return {
    slides: [
      {
        id: newSlideId(),
        heading: '',
        body: '',
        layout: 'content-only',
      },
    ],
  }
}

export function defaultQuizContent(): QuizContent {
  return {
    passing_score: 80,
    randomize_questions: true,
    questions: [
      {
        id: newQuestionId(),
        text: 'Sample question — replace with your own',
        type: 'single_select',
        options: [
          { id: 'a', text: 'Correct answer', correct: true },
          { id: 'b', text: 'Incorrect option', correct: false },
          { id: 'c', text: 'Another incorrect option', correct: false },
        ],
        explanation: 'Explain why the correct answer is right.',
      },
    ],
  }
}

function defaultNodeMapConfig(): NodeMapConfig {
  return {
    background_image: '',
    passing_score: 60,
    nodes: [
      {
        id: newNodeId(),
        x_percent: 50,
        y_percent: 40,
        icon: 'alert',
        label: 'Location 1',
        scenario: 'Describe what staff observe at this location.',
        question: {
          text: 'What type of incident is this?',
          options: [
            { id: 'a', text: 'Clinical' },
            { id: 'b', text: 'Cybersecurity / Privacy' },
            { id: 'c', text: 'Physical / Facilities' },
          ],
          correct_id: 'a',
        },
      },
    ],
  }
}

function defaultSortingConfig(): SortingConfig {
  return {
    categories: [
      { id: 'clinical', label: 'Clinical' },
      { id: 'cyber', label: 'Cybersecurity' },
      { id: 'physical', label: 'Physical' },
      { id: 'admin', label: 'Administrative' },
    ],
    cards: [{ id: 'c1', text: 'Example incident — edit or add more cards', category_id: 'clinical' }],
    passing_score: 80,
  }
}

function defaultDecisionTreeConfig(): DecisionTreeConfig {
  return {
    start_node_id: 'start',
    nodes: {
      start: {
        id: 'start',
        title: 'Scenario start',
        description: 'Describe the opening scenario.',
        choices: [
          { id: 'good', label: 'Take the safe action', next_node_id: 'good_end' },
          { id: 'bad', label: 'Take the risky action', next_node_id: 'bad_end' },
        ],
      },
      good_end: {
        id: 'good_end',
        title: 'Good outcome',
        description: 'Explain what went well.',
        outcome: 'good',
        teachable_moment: 'Key takeaway for staff.',
      },
      bad_end: {
        id: 'bad_end',
        title: 'Needs improvement',
        description: 'Explain what should have been done differently.',
        outcome: 'bad',
        teachable_moment: 'What to do next time.',
      },
    },
  }
}

function defaultHotspotConfig(): HotspotConfig {
  return {
    background_image: '',
    regions: [],
  }
}

export function defaultWorkshopContent(type: WorkshopType = 'node_map'): WorkshopContent {
  switch (type) {
    case 'sorting':
      return {
        workshop_type: 'sorting',
        title: 'Sorting challenge',
        instructions: 'Drag each incident card into the correct category.',
        config: defaultSortingConfig(),
      }
    case 'decision_tree':
      return {
        workshop_type: 'decision_tree',
        title: 'Interactive workshop',
        instructions: 'Follow the instructions to complete this activity.',
        config: defaultDecisionTreeConfig(),
      }
    case 'hotspot':
      return {
        workshop_type: 'hotspot',
        title: 'Interactive workshop',
        instructions: 'Follow the instructions to complete this activity.',
        config: defaultHotspotConfig(),
      }
    case 'node_map':
    default:
      return {
        workshop_type: 'node_map',
        title: 'Interactive workshop',
        instructions:
          'Explore the floor plan and tap each alert pin. Read the scenario and classify the incident.',
        config: defaultNodeMapConfig(),
      }
  }
}

export function createEmptyModule(
  type: 'lesson' | 'quiz' | 'workshop',
  orderIndex: number,
  courseId = 'new'
): Module {
  const content =
    type === 'lesson'
      ? defaultLessonContent()
      : type === 'quiz'
        ? defaultQuizContent()
        : defaultWorkshopContent('node_map')

  return {
    id: `temp-${Date.now()}-${orderIndex}`,
    course_id: courseId,
    title: type === 'lesson' ? 'New lesson' : type === 'quiz' ? 'Knowledge check' : 'Interactive workshop',
    type,
    order_index: orderIndex,
    content: content as unknown as Record<string, unknown>,
    created_at: new Date().toISOString(),
  }
}

/** Clone modules for the builder with fresh temp ids (keeps content intact). */
export function cloneModulesForBuilder(modules: Module[], courseId = 'new'): Module[] {
  return modules.map((m, index) => ({
    ...m,
    id: `temp-${Date.now()}-${index}`,
    course_id: courseId,
    order_index: index,
    content: JSON.parse(JSON.stringify(m.content)) as Record<string, unknown>,
    created_at: new Date().toISOString(),
  }))
}

export const LESSON_LAYOUTS = selectLayouts

export const LESSON_LAYOUT_LABELS: Record<(typeof selectLayouts)[number], string> = {
  'content-only': 'Content only (no image)',
  'image-right': 'Image right',
  'image-left': 'Image left',
  'image-top': 'Image top',
  'full-bleed': 'Full bleed',
  'image-only': 'Image only',
}
