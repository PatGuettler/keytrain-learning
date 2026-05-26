import type { Assignment, Course, Module, TrainingSession } from '@/types/course.types'
import type { Profile } from '@/types/user.types'
import { DEMO_ORG_ID, DEMO_USERS } from '@/lib/constants'

export const demoCourses: Course[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    org_id: DEMO_ORG_ID,
    title: 'Clinical Incident Reporting',
    description:
      'Learn to identify, classify, and report clinical incidents across your facility.',
    thumbnail_url: null,
    estimated_minutes: 45,
    is_published: true,
    created_by: DEMO_USERS.admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    org_id: DEMO_ORG_ID,
    title: 'Cybersecurity Awareness',
    description: 'Protect patient data and hospital systems from phishing and social engineering.',
    thumbnail_url: null,
    estimated_minutes: 30,
    is_published: true,
    created_by: DEMO_USERS.admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const demoModules: Module[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'What is a Clinical Incident?',
    type: 'lesson',
    order_index: 0,
    content: {
      slides: [
        {
          id: 'slide_1',
          heading: 'What is a Clinical Incident?',
          body: 'A clinical incident is any event that could have or did harm a patient during care delivery. This includes medication errors, falls, wrong-site procedures, and near-misses.',
          layout: 'image-right',
        },
        {
          id: 'slide_2',
          heading: 'Why Reporting Matters',
          body: 'Timely reporting enables root cause analysis, prevents recurrence, and fulfills regulatory obligations.',
          layout: 'full-bleed',
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Incident Classification Quiz',
    type: 'quiz',
    order_index: 1,
    content: {
      passing_score: 80,
      randomize_questions: true,
      questions: [
        {
          id: 'q1',
          text: 'What type of incident is giving a patient the wrong dosage?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Cybersecurity incident', correct: false },
            { id: 'b', text: 'Clinical incident', correct: true },
            { id: 'c', text: 'Physical infrastructure incident', correct: false },
          ],
          explanation:
            'Medication dosage errors directly affect patient safety and are classified as clinical incidents.',
        },
        {
          id: 'q2',
          text: 'A water leak in the parking garage is best classified as:',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Clinical incident', correct: false },
            { id: 'b', text: 'Physical / facilities incident', correct: true },
            { id: 'c', text: 'Privacy breach', correct: false },
          ],
          explanation: 'Facilities issues without direct patient harm are physical incidents.',
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Hospital Floor Incident Map',
    type: 'workshop',
    order_index: 2,
    content: {
      workshop_type: 'node_map',
      title: 'Identify the Incident Type',
      instructions: 'Click each alert icon to reveal the scenario and classify the incident.',
      config: {
        background_image: '',
        nodes: [
          {
            id: 'node_1',
            x_percent: 25,
            y_percent: 40,
            icon: 'alert',
            label: 'Nurses Station',
            scenario:
              'A nurse notices a patient chart accessed 12 times in one hour by the same unauthorized user.',
            question: {
              text: 'What type of incident is this?',
              options: [
                { id: 'a', text: 'Clinical' },
                { id: 'b', text: 'Cybersecurity / Privacy' },
                { id: 'c', text: 'Physical' },
              ],
              correct_id: 'b',
            },
          },
          {
            id: 'node_2',
            x_percent: 65,
            y_percent: 55,
            icon: 'alert',
            label: 'Patient Room 204',
            scenario: 'A patient received double the prescribed dose of insulin.',
            question: {
              text: 'What type of incident is this?',
              options: [
                { id: 'a', text: 'Clinical' },
                { id: 'b', text: 'Cybersecurity' },
                { id: 'c', text: 'Administrative' },
              ],
              correct_id: 'a',
            },
          },
        ],
      },
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Sort Incidents by Category',
    type: 'workshop',
    order_index: 3,
    content: {
      workshop_type: 'sorting',
      title: 'Incident Sorting Challenge',
      instructions: 'Drag each incident card into the correct category.',
      config: {
        categories: [
          { id: 'clinical', label: 'Clinical' },
          { id: 'cyber', label: 'Cybersecurity' },
          { id: 'physical', label: 'Physical' },
          { id: 'admin', label: 'Administrative' },
        ],
        cards: [
          { id: 'c1', text: 'Wrong medication administered', category_id: 'clinical' },
          { id: 'c2', text: 'Phishing email clicked by staff', category_id: 'cyber' },
          { id: 'c3', text: 'Broken elevator strands patients', category_id: 'physical' },
          { id: 'c4', text: 'Missing consent form', category_id: 'admin' },
          { id: 'c5', text: 'Patient fall with injury', category_id: 'clinical' },
          { id: 'c6', text: 'Ransomware on workstation', category_id: 'cyber' },
        ],
      },
    },
    created_at: new Date().toISOString(),
  },
]

export const demoProfiles: Profile[] = [
  {
    id: DEMO_USERS.admin.id,
    org_id: DEMO_ORG_ID,
    manager_id: null,
    full_name: DEMO_USERS.admin.fullName,
    role: 'admin',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: DEMO_USERS.manager.id,
    org_id: DEMO_ORG_ID,
    manager_id: null,
    full_name: DEMO_USERS.manager.fullName,
    role: 'manager',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: DEMO_USERS.employee.id,
    org_id: DEMO_ORG_ID,
    manager_id: DEMO_USERS.manager.id,
    full_name: DEMO_USERS.employee.fullName,
    role: 'employee',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let demoAssignments: Assignment[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    course_id: '10000000-0000-0000-0000-000000000001',
    user_id: DEMO_USERS.employee.id,
    assigned_by: DEMO_USERS.manager.id,
    assigned_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'in_progress',
    force_retake: false,
    course: demoCourses[0],
  },
]

const demoSessions: TrainingSession[] = []

export function getDemoAssignments(userId?: string) {
  return demoAssignments
    .filter((a) => !userId || a.user_id === userId)
    .map((a) => ({ ...a, course: demoCourses.find((c) => c.id === a.course_id) }))
}

export function getDemoCourses(publishedOnly = false) {
  return publishedOnly ? demoCourses.filter((c) => c.is_published) : demoCourses
}

export function getDemoModules(courseId: string) {
  return demoModules.filter((m) => m.course_id === courseId).sort((a, b) => a.order_index - b.order_index)
}

export function getDemoProfiles(role?: string, managerId?: string) {
  let list = [...demoProfiles]
  if (role) list = list.filter((p) => p.role === role)
  if (managerId) list = list.filter((p) => p.manager_id === managerId || p.id === managerId)
  return list
}

export function upsertDemoAssignment(assignment: Assignment) {
  const idx = demoAssignments.findIndex((a) => a.id === assignment.id)
  if (idx >= 0) demoAssignments[idx] = assignment
  else demoAssignments.push(assignment)
}

export function getDemoSessions(userId: string) {
  return demoSessions.filter((s) => s.user_id === userId)
}

export function createDemoSession(assignmentId: string, userId: string, courseId: string): TrainingSession {
  const session: TrainingSession = {
    id: crypto.randomUUID(),
    assignment_id: assignmentId,
    user_id: userId,
    course_id: courseId,
    attempt_number: 1,
    started_at: new Date().toISOString(),
    completed_at: null,
    time_spent_seconds: 0,
    score: null,
    passed: null,
  }
  demoSessions.push(session)
  return session
}

export function updateDemoSession(id: string, patch: Partial<TrainingSession>) {
  const s = demoSessions.find((x) => x.id === id)
  if (s) Object.assign(s, patch)
  return s
}
