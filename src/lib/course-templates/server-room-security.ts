import { cloneModulesForBuilder } from '@/lib/module-defaults'
import type { Module } from '@/types/course.types'

const SERVER_ROOM_MODULES: Omit<Module, 'course_id' | 'created_at'>[] = [
  {
    id: 'temp-sr-1',
    title: 'Why Server Rooms Matter',
    type: 'lesson',
    order_index: 0,
    content: {
      slides: [
        {
          id: 'sr_slide_1',
          heading: 'Critical infrastructure behind the scenes',
          body: 'Server rooms and data centers power email, payroll, customer records, and day-to-day operations. A breach or outage here can affect **every team** in your organization—not just IT.\n\nEvery employee has a role in protecting these spaces, even if you rarely enter them.',
          layout: 'image-right',
          illustration: { key: 'cybersecurity', alt: 'Cybersecurity and data protection', caption: '' },
        },
        {
          id: 'sr_slide_2',
          heading: 'What is at risk?',
          body: '- **Confidential data** — customer, employee, and business information\n- **Service availability** — downtime stops work across the org\n- **Physical safety** — power, cooling, and fire hazards\n- **Compliance** — many industries require controlled access and audit trails',
          layout: 'image-left',
          illustration: { key: 'reporting', alt: 'Security checklist', caption: '' },
        },
      ],
    },
  },
  {
    id: 'temp-sr-2',
    title: 'Physical Access & Visitor Control',
    type: 'lesson',
    order_index: 1,
    content: {
      slides: [
        {
          id: 'sr_slide_3',
          heading: 'Access control basics',
          body: 'Server rooms should use **badge access**, **mantraps** or two-door entry where possible, and **no tailgating**. If someone holds the door without badging in, politely ask them to use their own credential or escort them through the proper process.',
          layout: 'image-right',
          illustration: { key: 'stop_report', alt: 'Stop and report security issues', caption: '' },
        },
        {
          id: 'sr_slide_4',
          heading: 'Visitors and vendors',
          body: 'All visitors must be **escorted**, **logged**, and given **temporary badges** that are collected on exit. Never leave a vendor alone in a server room—even for "quick maintenance."\n\nReport propped-open doors, unknown persons, or missing signage immediately to IT or security.',
          layout: 'image-top',
          illustration: { key: 'team_safety', alt: 'Team safety and awareness', caption: '' },
        },
      ],
    },
  },
  {
    id: 'temp-sr-3',
    title: 'Cyber Hygiene in Technical Spaces',
    type: 'lesson',
    order_index: 2,
    content: {
      slides: [
        {
          id: 'sr_slide_5',
          heading: 'Workstations and removable media',
          body: 'Do not plug personal phones, USB drives, or unapproved laptops into server room equipment. Use only **organization-approved** tools and change-management processes for updates.\n\nLock screens when stepping away—even inside a restricted area.',
          layout: 'image-right',
          illustration: { key: 'cybersecurity', alt: 'Secure workstation practices', caption: '' },
        },
        {
          id: 'sr_slide_6',
          heading: 'Cables, environment, and reporting',
          body: '- Keep cable trays neat; report tripping hazards or exposed power\n- Never block CRAC vents or fire suppression nozzles\n- Report **high temperature**, **water leaks**, **smoke**, or **strange odors** immediately\n- Use the org incident channel—not social media',
          layout: 'full-bleed',
          illustration: { key: 'reporting', alt: 'Incident reporting', caption: '' },
        },
      ],
    },
  },
  {
    id: 'temp-sr-4',
    title: 'Server Room Security Map',
    type: 'workshop',
    order_index: 3,
    content: {
      workshop_type: 'node_map',
      title: 'Server Room Security Walkthrough',
      instructions:
        'Explore the server room floor plan and tap each alert pin. Read each scenario and choose the best security response.',
      config: {
        background_image: '',
        floor_plan: 'server_room',
        passing_score: 70,
        nodes: [
          {
            id: 'sr_node_1',
            x_percent: 50,
            y_percent: 88,
            icon: 'alert',
            label: 'Entry door',
            scenario:
              'You arrive to find the server room door propped open with a trash can. No one is visible inside.',
            question: {
              text: 'What should you do first?',
              options: [
                { id: 'a', text: 'Remove the prop, close the door, and report to IT/security' },
                { id: 'b', text: 'Enter quickly to check servers before closing' },
                { id: 'c', text: 'Ignore it—someone is probably working inside' },
              ],
              correct_id: 'a',
            },
          },
          {
            id: 'sr_node_2',
            x_percent: 18,
            y_percent: 42,
            icon: 'alert',
            label: 'Network wall',
            scenario:
              'A patch panel port is labeled but an unknown laptop is plugged directly into the core switch.',
            question: {
              text: 'What is the best action?',
              options: [
                { id: 'a', text: 'Unplug it yourself without telling anyone' },
                { id: 'b', text: 'Report it immediately; do not use or move the device' },
                { id: 'c', text: 'Assume it is a vendor and leave it' },
              ],
              correct_id: 'b',
            },
          },
          {
            id: 'sr_node_3',
            x_percent: 50,
            y_percent: 38,
            icon: 'alert',
            label: 'Rack row A',
            scenario:
              'A rack door is open and an unbadged person is taking photos of serial numbers on equipment.',
            question: {
              text: 'What should you do?',
              options: [
                { id: 'a', text: 'Ask if they need help and verify they are escorted/authorized' },
                { id: 'b', text: 'Take your own photos for reference' },
                { id: 'c', text: 'Walk away—they might be from IT' },
              ],
              correct_id: 'a',
            },
          },
          {
            id: 'sr_node_4',
            x_percent: 91,
            y_percent: 28,
            icon: 'alert',
            label: 'UPS room',
            scenario:
              'The UPS panel shows a warning light and a burning smell is noticeable near the battery cabinet.',
            question: {
              text: 'What is the correct response?',
              options: [
                { id: 'a', text: 'Reset the UPS yourself to clear the alarm' },
                { id: 'b', text: 'Evacuate if needed and report to facilities/IT immediately' },
                { id: 'c', text: 'Wait until the next maintenance window' },
              ],
              correct_id: 'b',
            },
          },
          {
            id: 'sr_node_5',
            x_percent: 91,
            y_percent: 58,
            icon: 'alert',
            label: 'CRAC unit',
            scenario:
              'The cooling unit is making loud grinding noise and the room temperature display reads 85°F (29°C).',
            question: {
              text: 'What should you do?',
              options: [
                { id: 'a', text: 'Report overheating risk to IT/facilities right away' },
                { id: 'b', text: 'Open the exterior door to cool the room' },
                { id: 'c', text: 'Continue work—servers can handle brief heat' },
              ],
              correct_id: 'a',
            },
          },
        ],
      },
    },
  },
  {
    id: 'temp-sr-5',
    title: 'Server Room Security Quiz',
    type: 'quiz',
    order_index: 4,
    content: {
      passing_score: 80,
      randomize_questions: true,
      questions: [
        {
          id: 'sr_q1',
          text: 'Who may enter a server room without an escort?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Only authorized, badged personnel per org policy', correct: true },
            { id: 'b', text: 'Any employee who knows the door code', correct: false },
            { id: 'c', text: 'Vendors with a scheduled appointment', correct: false },
          ],
          explanation: 'Visitors and vendors should be escorted and logged even with appointments.',
        },
        {
          id: 'sr_q2',
          text: 'You find a server room door propped open. What is the best first step?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Secure the door and report the issue', correct: true },
            { id: 'b', text: 'Enter alone to inspect equipment', correct: false },
            { id: 'c', text: 'Wait for the next shift to notice', correct: false },
          ],
          explanation: 'Propped doors defeat access control—close and report immediately.',
        },
        {
          id: 'sr_q3',
          text: 'Which items should never be plugged into production server equipment without approval?',
          type: 'multi_select',
          options: [
            { id: 'a', text: 'Personal USB flash drives', correct: true },
            { id: 'b', text: 'Organization-approved maintenance laptop', correct: false },
            { id: 'c', text: 'Personal smartphones for charging', correct: true },
            { id: 'd', text: 'Approved KVM console', correct: false },
          ],
          explanation: 'Personal removable media and chargers introduce malware and policy violations.',
        },
        {
          id: 'sr_q4',
          text: 'Tailgating through a badge reader is acceptable if you recognize the person.',
          type: 'single_select',
          options: [
            { id: 'a', text: 'True', correct: false },
            { id: 'b', text: 'False', correct: true },
          ],
          explanation: 'Everyone must badge in individually; tailgating bypasses access logs.',
        },
        {
          id: 'sr_q5',
          text: 'A burning smell near UPS batteries should be reported immediately.',
          type: 'single_select',
          options: [
            { id: 'a', text: 'True', correct: true },
            { id: 'b', text: 'False', correct: false },
          ],
          explanation: 'Battery and power issues can escalate quickly—report and evacuate if needed.',
        },
      ],
    },
  },
  {
    id: 'temp-sr-6',
    title: 'Sort Security Risks',
    type: 'workshop',
    order_index: 5,
    content: {
      workshop_type: 'sorting',
      title: 'Classify Server Room Risks',
      instructions: 'Drag each scenario into the correct risk category.',
      config: {
        passing_score: 80,
        categories: [
          { id: 'physical', label: 'Physical security' },
          { id: 'cyber', label: 'Cyber / data' },
          { id: 'environmental', label: 'Environmental' },
          { id: 'policy', label: 'Policy / process' },
        ],
        cards: [
          { id: 'c1', text: 'Unbadged visitor in the server room', category_id: 'physical' },
          { id: 'c2', text: 'Unknown laptop on core switch', category_id: 'cyber' },
          { id: 'c3', text: 'CRAC failure and rising temperature', category_id: 'environmental' },
          { id: 'c4', text: 'Maintenance performed without change ticket', category_id: 'policy' },
          { id: 'c5', text: 'Tailgating through mantrap', category_id: 'physical' },
          { id: 'c6', text: 'Ransomware alert on management server', category_id: 'cyber' },
        ],
      },
    },
  },
]

export function getServerRoomSecurityTemplate(): {
  title: string
  description: string
  estimated_minutes: number
  modules: Module[]
} {
  return {
    title: 'Server Room Security & Cyber Safety',
    description:
      'Protect critical infrastructure: physical access, environmental awareness, and cyber hygiene for staff who work near or support data center spaces.',
    estimated_minutes: 45,
    modules: cloneModulesForBuilder(
      SERVER_ROOM_MODULES.map((m, i) => ({
        ...m,
        course_id: 'template',
        created_at: new Date().toISOString(),
        order_index: i,
      })) as Module[]
    ),
  }
}
