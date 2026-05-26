import type { Assignment, Course, Module, ModuleAttempt, TrainingSession } from '@/types/course.types'
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
          illustration: {
            key: 'clinical_incident',
            alt: 'Clinical incident alert at point of care',
            caption: 'When in doubt, stop and report — patient safety comes first.',
          },
        },
        {
          id: 'slide_2',
          heading: 'Why Reporting Matters',
          body: 'Timely reporting enables root cause analysis, prevents recurrence, and fulfills regulatory obligations. Every report helps protect the next patient.',
          layout: 'image-top',
          illustration: {
            key: 'reporting',
            alt: 'Completed incident report with checkmark',
            caption: 'Reports feed quality improvement and compliance workflows.',
          },
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
      instructions:
        'Explore the ward floor plan and tap each alert pin. Read the scenario at that location and classify the incident.',
      config: {
        background_image: '',
        nodes: [
          {
            id: 'node_1',
            x_percent: 50,
            y_percent: 38,
            icon: 'alert',
            label: 'Nurses Station',
            scenario:
              'The EHR shows a patient chart accessed 12 times in one hour by a user who is not on the care team. No one on shift recognizes the login.',
            question: {
              text: 'What type of incident is this?',
              options: [
                { id: 'a', text: 'Clinical' },
                { id: 'b', text: 'Cybersecurity / Privacy' },
                { id: 'c', text: 'Physical / Facilities' },
              ],
              correct_id: 'b',
            },
          },
          {
            id: 'node_2',
            x_percent: 81,
            y_percent: 22,
            icon: 'alert',
            label: 'Room 204',
            scenario:
              'A patient received double the prescribed dose of insulin. The error was caught during the bedside barcode scan after administration.',
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
          {
            id: 'node_3',
            x_percent: 12,
            y_percent: 72,
            icon: 'alert',
            label: 'Pharmacy',
            scenario:
              'Two look-alike medication vials were stored next to each other. A technician nearly dispensed the wrong drug before catching the similar packaging.',
            question: {
              text: 'What type of incident is this?',
              options: [
                { id: 'a', text: 'Clinical (medication safety)' },
                { id: 'b', text: 'Cybersecurity' },
                { id: 'c', text: 'Physical only' },
              ],
              correct_id: 'a',
            },
          },
          {
            id: 'node_4',
            x_percent: 20,
            y_percent: 88,
            icon: 'alert',
            label: 'Waiting Area',
            scenario:
              'A visitor slipped on a wet floor near reception. No signage was posted after housekeeping mopped the area.',
            question: {
              text: 'What type of incident is this?',
              options: [
                { id: 'a', text: 'Clinical' },
                { id: 'b', text: 'Physical / Facilities' },
                { id: 'c', text: 'Administrative' },
              ],
              correct_id: 'b',
            },
          },
          {
            id: 'node_5',
            x_percent: 73,
            y_percent: 88,
            icon: 'alert',
            label: 'IT / EHR',
            scenario:
              'A workstation was left unlocked in the server room corridor with patient schedules visible on screen during a fire drill evacuation.',
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
        passing_score: 70,
        categories: [
          { id: 'clinical', label: 'Clinical' },
          { id: 'cyber', label: 'Cybersecurity' },
          { id: 'physical', label: 'Physical' },
          { id: 'admin', label: 'Administrative' },
        ],
        category_guides: {
          clinical: {
            summary:
              'Clinical incidents directly affect patient safety: medications, falls, treatment errors, and near-misses.',
            review_module_index: 0,
          },
          cyber: {
            summary:
              'Cybersecurity incidents involve data breaches, phishing, ransomware, and unauthorized access to PHI.',
            review_module_index: 1,
          },
          physical: {
            summary:
              'Physical/facilities incidents cover building systems, slips, equipment failures — not direct clinical care errors.',
            review_module_index: 0,
          },
          admin: {
            summary:
              'Administrative incidents include consent, scheduling, billing, and documentation process failures.',
            review_module_index: 0,
          },
        },
        cards: [
          {
            id: 'c1',
            text: 'Wrong medication administered',
            category_id: 'clinical',
            hint: 'Medication errors that reach or could reach a patient are clinical incidents.',
          },
          {
            id: 'c2',
            text: 'Phishing email clicked by staff',
            category_id: 'cyber',
            hint: 'Phishing and unauthorized data access are cybersecurity/privacy incidents.',
          },
          {
            id: 'c3',
            text: 'Broken elevator strands patients',
            category_id: 'physical',
            hint: 'Facilities and infrastructure issues without a direct care error are physical incidents.',
          },
          {
            id: 'c4',
            text: 'Missing consent form',
            category_id: 'admin',
            hint: 'Consent and paperwork gaps are administrative — not clinical or facilities.',
          },
          {
            id: 'c5',
            text: 'Patient fall with injury',
            category_id: 'clinical',
            hint: 'Patient falls with injury are clinical incidents because they harm patient safety.',
          },
          {
            id: 'c6',
            text: 'Ransomware on workstation',
            category_id: 'cyber',
            hint: 'Ransomware attacks on hospital systems are cybersecurity incidents.',
          },
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
const demoModuleAttempts: ModuleAttempt[] = []

const DEMO_ATTEMPTS_KEY = 'guardianmd-module-attempts'

function loadPersistedAttempts(): void {
  try {
    const raw = localStorage.getItem(DEMO_ATTEMPTS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as ModuleAttempt[]
    demoModuleAttempts.push(...parsed)
  } catch {
    /* ignore */
  }
}

function persistAttempts() {
  try {
    localStorage.setItem(DEMO_ATTEMPTS_KEY, JSON.stringify(demoModuleAttempts))
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') loadPersistedAttempts()

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

export function saveDemoModuleAttempt(
  attempt: Omit<ModuleAttempt, 'id'> & { id?: string }
) {
  const record: ModuleAttempt = {
    id: attempt.id ?? crypto.randomUUID(),
    session_id: attempt.session_id,
    module_id: attempt.module_id,
    user_id: attempt.user_id,
    started_at: attempt.started_at ?? new Date().toISOString(),
    completed_at: attempt.completed_at ?? new Date().toISOString(),
    time_spent_seconds: attempt.time_spent_seconds ?? 0,
    score: attempt.score ?? null,
    answers: attempt.answers ?? null,
    interactions: attempt.interactions ?? null,
  }
  const idx = demoModuleAttempts.findIndex(
    (a) => a.session_id === record.session_id && a.module_id === record.module_id
  )
  if (idx >= 0) demoModuleAttempts[idx] = record
  else demoModuleAttempts.push(record)
  persistAttempts()
  return record
}

export function getDemoModuleAttempts(userId: string, sessionId?: string) {
  return demoModuleAttempts.filter(
    (a) => a.user_id === userId && (!sessionId || a.session_id === sessionId)
  )
}
