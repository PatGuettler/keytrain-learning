import type { Course, Module } from '@/types/course.types'

/** Default organization ID used when seeding courses in Supabase. */
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

const now = () => new Date().toISOString()

export const seedCourses: Course[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    org_id: DEFAULT_ORG_ID,
    title: 'Incident Awareness & Reporting',
    description:
      'Healthcare Course 6: Recognize incident types, report promptly, and protect patients, privacy, and operations.',
    thumbnail_url: null,
    estimated_minutes: 60,
    max_attempts: 3,
    show_results_after_completion: false,
    certificate_enabled: false,
    certificate_expires_days: null,
    is_published: true,
    created_by: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    org_id: DEFAULT_ORG_ID,
    title: 'Cybersecurity Awareness',
    description: 'Protect patient data and hospital systems from phishing and social engineering.',
    thumbnail_url: null,
    estimated_minutes: 30,
    max_attempts: 3,
    show_results_after_completion: false,
    certificate_enabled: false,
    certificate_expires_days: null,
    is_published: true,
    created_by: null,
    created_at: now(),
    updated_at: now(),
  },
]

export const seedModules: Module[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Introduction',
    type: 'lesson',
    order_index: 0,
    content: {
      slides: [
        {
          id: 'intro_1',
          heading: 'Incident Awareness & Reporting',
          body: 'In healthcare environments, every action—whether clinical, administrative, or technical—has the potential to impact patient safety, privacy, and organizational integrity. Incident awareness and reporting is the foundation of maintaining a safe, compliant, and trustworthy healthcare system.',
          layout: 'image-right',
          illustration: {
            key: 'team_safety',
            alt: 'Healthcare team focused on safety',
            caption: 'Healthcare Course 6 — Incident Awareness & Reporting',
          },
        },
        {
          id: 'intro_2',
          heading: 'What Is an Incident?',
          body: 'An incident is any event that could compromise patient care, protected health information (PHI), physical safety, or operational continuity. This includes not only confirmed issues—such as data breaches or medical errors—but also near misses, suspicious activity, and unusual system behavior.\n\nEarly recognition of these events is critical in preventing escalation and minimizing harm.',
          layout: 'image-top',
          illustration: {
            key: 'clinical_incident',
            alt: 'Incident awareness in healthcare',
          },
        },
        {
          id: 'intro_3',
          heading: 'Your Role as the First Line of Defense',
          body: 'Healthcare staff play a vital role. You are often the first to notice when something doesn’t seem right—whether it’s a misplaced patient record, an unfamiliar person in a restricted area, a phishing email, or a system acting abnormally.\n\nRecognizing these warning signs and taking prompt action ensures risks are addressed before they become serious incidents.',
          layout: 'image-right',
          illustration: {
            key: 'stop_report',
            alt: 'Stop and report when something seems wrong',
          },
        },
        {
          id: 'intro_4',
          heading: 'Reporting Is About Protection—Not Blame',
          body: 'Effective incident reporting is not about assigning blame—it is about protecting patients, supporting staff, and strengthening the organization.\n\nA strong reporting culture encourages transparency, accountability, and continuous improvement. When incidents are reported quickly and accurately, healthcare organizations can respond faster, reduce impact, and implement safeguards to prevent future occurrences.',
          layout: 'image-top',
          illustration: {
            key: 'reporting',
            alt: 'Incident reporting supports improvement',
            caption: 'Timely, accurate reports help the whole organization learn and improve.',
          },
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000010',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Types of Incidents in Healthcare',
    type: 'lesson',
    order_index: 1,
    content: {
      slides: [
        {
          id: 'types_0',
          heading: 'Five Main Categories',
          body: 'Understanding the different types of incidents is the first step in recognizing when something is wrong. Incidents in healthcare typically fall into five main categories:\n\n1. Cybersecurity\n2. Human-Related\n3. Physical Security\n4. Operational\n5. Clinical',
          layout: 'full-bleed',
          illustration: { key: 'cybersecurity', alt: 'Healthcare incident categories' },
        },
        {
          id: 'types_1',
          heading: '1. Cybersecurity Incidents',
          body: 'These involve threats to systems, networks, or electronic data.\n\nExamples:\n• Phishing emails asking for login credentials\n• Ransomware locking patient records\n• Unauthorized access to electronic health records (EHR)\n• Suspicious pop-ups or unknown software installations\n\nWhy it matters: Cyber incidents can expose sensitive patient data (PHI), disrupt care delivery, and lead to legal consequences.',
          layout: 'image-right',
          illustration: { key: 'cybersecurity', alt: 'Cybersecurity incident examples' },
        },
        {
          id: 'types_2',
          heading: '2. Human-Related Incidents',
          body: 'These occur due to mistakes, negligence, or intentional misuse by individuals.\n\nExamples:\n• Sending patient information to the wrong person\n• Weak or shared passwords\n• Improper disposal of sensitive documents\n• Insider threats or misuse of access privileges\n\nWhy it matters: Human error is one of the leading causes of healthcare incidents and can directly impact patient privacy and safety.',
          layout: 'image-top',
          illustration: { key: 'team_safety', alt: 'Human-related incident examples' },
        },
        {
          id: 'types_3',
          heading: '3. Physical Security Incidents',
          body: 'These involve unauthorized physical access or safety risks within facilities.\n\nExamples:\n• Unauthorized individuals in restricted areas\n• Lost or stolen devices (laptops, USB drives)\n• Unlocked offices containing sensitive information\n• Suspicious behavior in patient or staff areas\n\nWhy it matters: Physical breaches can lead to data exposure, theft, or harm to patients and staff.',
          layout: 'image-right',
          illustration: { key: 'stop_report', alt: 'Physical security incident examples' },
        },
        {
          id: 'types_4',
          heading: '4. Operational Incidents',
          body: 'These affect the normal functioning of healthcare systems and services.\n\nExamples:\n• System outages or downtime\n• Equipment failures\n• Disruptions in patient care workflows\n• Incorrect data entry affecting treatment decisions\n\nWhy it matters: Operational issues can delay care, create confusion, and increase the risk of medical errors.',
          layout: 'image-top',
          illustration: { key: 'reporting', alt: 'Operational incident examples' },
        },
        {
          id: 'types_5',
          heading: '5. Clinical Incidents',
          body: 'These occur during patient care and can directly impact treatment accuracy, patient safety, and health outcomes.\n\nExamples include medication errors, patient identification errors, infection control breaches, patient falls, documentation errors, delays in care, equipment issues, diagnostic errors, communication breakdowns, and lab or test result errors.\n\nWhy it matters: Clinical incidents often result from small breakdowns in care, communication, or processes, but can lead to serious patient harm if not identified and addressed quickly.',
          layout: 'image-right',
          illustration: { key: 'clinical_incident', alt: 'Clinical incident examples' },
        },
        {
          id: 'types_6',
          heading: 'Key Takeaway',
          body: 'Incidents are not always obvious or intentional. They can affect one, multiple, or all patients in a healthcare environment (Rahman et al., 2022).\n\nIf something seems unusual across technology, people, physical spaces, operations, or clinical care, it should be treated seriously and reported.',
          layout: 'full-bleed',
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000011',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Recognizing and Reporting an Incident',
    type: 'lesson',
    order_index: 2,
    content: {
      slides: [
        {
          id: 'report_1',
          heading: 'Why Speed Matters',
          body: 'Recognizing and reporting incidents quickly is critical to protecting patients, data, and healthcare operations. Every staff member plays a role in this process.\n\nEnsuring proper incident reporting practices for all healthcare providers in clinical practice settings is vital for patient safety and patient care (Oweidat et al., 2023).',
          layout: 'image-top',
          illustration: { key: 'reporting', alt: 'Recognizing and reporting incidents' },
        },
        {
          id: 'report_2',
          heading: 'Step 1: Recognize Warning Signs',
          body: 'Be alert to anything that seems unusual or out of place.\n\nCommon warning signs include:\n• Unexpected system behavior or slowdowns\n• Emails requesting sensitive information\n• Missing files, devices, or documents\n• Individuals accessing areas they shouldn’t\n• Errors in patient records or unexpected changes',
          layout: 'image-right',
          illustration: { key: 'cybersecurity', alt: 'Warning signs of incidents' },
        },
        {
          id: 'report_3',
          heading: 'Step 2: Act Quickly',
          body: 'Time is critical. The sooner an incident is reported, the faster it can be contained.\n\nDo not:\n• Ignore the issue\n• Try to fix major problems yourself\n• Delay reporting to “see if it resolves”',
          layout: 'image-top',
          illustration: { key: 'stop_report', alt: 'Act quickly when you notice an incident' },
        },
        {
          id: 'report_4',
          heading: 'Step 3: Report the Incident',
          body: 'Follow your organization’s reporting process. Typically this includes:\n• Notifying your supervisor or IT/security team\n• Submitting an incident report (if required)\n• Providing clear, factual details of what you observed\n\nInclude: what happened, when it happened, where it occurred, and any systems or people involved.',
          layout: 'image-right',
          illustration: { key: 'reporting', alt: 'How to report an incident' },
        },
        {
          id: 'report_5',
          heading: 'Step 4: Support the Response',
          body: 'After reporting, continue to cooperate with any follow-up actions. This may include answering questions, avoiding affected systems, and following updated instructions or safeguards.\n\nImportant reminder: Reporting is about protection—not punishment. Even if you are unsure, it is always better to report than to stay silent.\n\n✅ Key takeaway: See something. Say something. Your quick action can prevent data breaches, protect patients, and stop small issues from becoming major incidents.',
          layout: 'full-bleed',
          illustration: {
            key: 'team_safety',
            alt: 'See something, say something',
            caption: 'Your quick action can prevent harm.',
          },
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000012',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Real World Example of Clinical Incident',
    type: 'lesson',
    order_index: 3,
    content: {
      slides: [
        {
          id: 'example_1',
          heading: 'Medication Near-Miss',
          body: 'During a busy evening shift, a nurse prepares medications for two patients with similar names in adjacent rooms. The barcode scanner beeps an alert, but the nurse overrides it after a brief distraction.\n\nA colleague performing double-check verification notices the medication does not match the active order. Administration is stopped before the patient receives the wrong drug.',
          layout: 'image-right',
          illustration: {
            key: 'clinical_incident',
            alt: 'Clinical medication near-miss scenario',
          },
        },
        {
          id: 'example_2',
          heading: 'Classification and Response',
          body: 'This is a clinical incident (medication safety near-miss). Even though no harm occurred, it must be reported so the organization can:\n• Review barcode override practices\n• Reinforce distraction-free medication zones\n• Update training on patient identification\n\nEarly reporting turned a potential dosage error into a learning opportunity—protecting the next patient.',
          layout: 'image-top',
          illustration: {
            key: 'reporting',
            alt: 'Reporting clinical near-misses',
            caption: 'Near-misses count. Report them the same way you would a confirmed error.',
          },
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000013',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'References',
    type: 'lesson',
    order_index: 4,
    content: {
      slides: [
        {
          id: 'refs_1',
          heading: 'References',
          body: 'Oweidat, I., Al-Mugheed, K., Alsenany, S.A. et al. Awareness of reporting practices and barriers to incident reporting among nurses. BMC Nurs 22, 231 (2023). https://doi.org/10.1186/s12912-023-01376-9\n\nRahman Jabin MS, Pan D, Nilsson E. Characterizing healthcare incidents in Sweden related to health information technology affecting care management of multiple patients. Health Informatics Journal. 2022;28(2). doi:10.1177/14604582221105440',
          layout: 'full-bleed',
        },
      ],
    },
    created_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    course_id: '10000000-0000-0000-0000-000000000001',
    title: 'Incident Awareness Assessment',
    type: 'quiz',
    order_index: 5,
    content: {
      passing_score: 80,
      randomize_questions: false,
      questions: [
        {
          id: 'q1',
          text: 'What type of incident would be a clinical incident?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Giving a patient the wrong dosage', correct: true },
            { id: 'b', text: 'Clicking on a phishing email', correct: false },
            { id: 'c', text: 'Water leak', correct: false },
            { id: 'd', text: 'Charting', correct: false },
          ],
          explanation: 'Medication dosage errors directly affect patient safety and are clinical incidents.',
        },
        {
          id: 'q2',
          text: 'What is considered a security or privacy incident?',
          type: 'single_select',
          options: [
            { id: 'a', text: '3rd party contractor walking into a restricted area', correct: true },
            { id: 'b', text: 'Losing a laptop charger', correct: false },
            { id: 'c', text: 'Printer running out of ink', correct: false },
            { id: 'd', text: 'Daily operations changing', correct: false },
          ],
          explanation:
            'Unauthorized physical access to restricted areas is a physical security and privacy risk.',
        },
        {
          id: 'q3',
          text: 'Why is early reporting important?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Reduces paperwork', correct: false },
            { id: 'b', text: 'Ensures there is no investigation', correct: false },
            { id: 'c', text: 'Does not hold anyone liable', correct: false },
            { id: 'd', text: 'Allows for faster response time and minimizes harm', correct: true },
          ],
          explanation: 'Early reporting enables faster containment and reduces harm to patients and systems.',
        },
        {
          id: 'q4',
          text: 'What is a type of incident?',
          type: 'multi_select',
          options: [
            { id: 'a', text: 'Clinical', correct: true },
            { id: 'b', text: 'Cyber', correct: true },
            { id: 'c', text: 'Physical', correct: true },
            { id: 'd', text: 'Operational', correct: true },
          ],
          explanation:
            'Healthcare incidents include clinical, cyber, physical security, operational, and human-related categories.',
        },
        {
          id: 'q5',
          text: 'How does reporting support patient safety?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Reduces staff responsibilities', correct: false },
            { id: 'b', text: 'Prevents future incidents and improves response', correct: true },
            { id: 'c', text: 'Limits communications', correct: false },
            { id: 'd', text: 'Avoids system updates', correct: false },
          ],
          explanation: 'Reporting drives improvement, faster response, and prevention of future harm.',
        },
        {
          id: 'q6',
          text: 'Who should incidents be reported to?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Social Media', correct: false },
            { id: 'b', text: 'Family members', correct: false },
            { id: 'c', text: 'Friends', correct: false },
            { id: 'd', text: 'None of the above', correct: true },
          ],
          explanation:
            'Report through your supervisor, IT/security, or your organization’s official incident process—not informal channels.',
        },
        {
          id: 'q7',
          text: 'What could happen if incidents go unreported?',
          type: 'multi_select',
          options: [
            { id: 'a', text: 'Risks lower within your working environment', correct: false },
            { id: 'b', text: 'Incidents in the workplace resolve on their own', correct: false },
            { id: 'c', text: 'Risks can grow and cause greater harm', correct: true },
            { id: 'd', text: 'None of the above', correct: false },
          ],
          explanation: 'Unreported incidents often escalate; risks can grow and cause greater harm over time.',
        },
        {
          id: 'q8',
          text: 'Why is reporting not about blame?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Because no one is responsible', correct: false },
            { id: 'b', text: 'Reporting focuses on punishment', correct: false },
            {
              id: 'c',
              text: 'Reporting focuses on improvement and protection of the working environment',
              correct: true,
            },
            { id: 'd', text: 'Because incidents are not important', correct: false },
          ],
          explanation: 'Reporting culture should focus on learning, protection, and system improvement—not blame.',
        },
        {
          id: 'q9',
          text: 'How can reporting improve systems?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'By ignoring issues', correct: false },
            { id: 'b', text: 'By identifying weaknesses and strengthening defenses', correct: true },
            { id: 'c', text: 'Reduces staff awareness', correct: false },
            { id: 'd', text: 'Limits access to systems', correct: false },
          ],
          explanation: 'Incident data reveals gaps so organizations can strengthen policies, training, and controls.',
        },
        {
          id: 'q10',
          text: 'What should you do if you are unsure if an incident occurred?',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Ignore it', correct: false },
            { id: 'b', text: 'Let someone else report it', correct: false },
            { id: 'c', text: 'Fix the incident yourself', correct: false },
            { id: 'd', text: 'Report it anyway', correct: true },
          ],
          explanation: 'When in doubt, report. It is better to report than to stay silent.',
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
    order_index: 6,
    content: {
      workshop_type: 'node_map',
      title: 'Identify the Incident Type',
      instructions:
        'Explore the ward floor plan and tap each alert pin. Read the scenario at that location and classify the incident.',
      config: {
        background_image: '',
        passing_score: 60,
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
                { id: 'b', text: 'Cybersecurity' },
                { id: 'c', text: 'Physical Security' },
                { id: 'd', text: 'Operational' },
                { id: 'e', text: 'Human-Related' },
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
                { id: 'c', text: 'Physical Security' },
                { id: 'd', text: 'Operational' },
                { id: 'e', text: 'Human-Related' },
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
                { id: 'a', text: 'Clinical' },
                { id: 'b', text: 'Cybersecurity' },
                { id: 'c', text: 'Physical Security' },
                { id: 'd', text: 'Operational' },
                { id: 'e', text: 'Human-Related' },
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
                { id: 'b', text: 'Cybersecurity' },
                { id: 'c', text: 'Physical Security' },
                { id: 'd', text: 'Operational' },
                { id: 'e', text: 'Human-Related' },
              ],
              correct_id: 'c',
            },
          },
          {
            id: 'node_5',
            x_percent: 73,
            y_percent: 88,
            icon: 'alert',
            label: 'IT / EHR',
            scenario:
              'The EHR is down for 45 minutes across the unit. Staff revert to paper orders, delaying medication administration.',
            question: {
              text: 'What type of incident is this?',
              options: [
                { id: 'a', text: 'Clinical' },
                { id: 'b', text: 'Cybersecurity' },
                { id: 'c', text: 'Physical Security' },
                { id: 'd', text: 'Operational' },
                { id: 'e', text: 'Human-Related' },
              ],
              correct_id: 'd',
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
    order_index: 7,
    content: {
      workshop_type: 'sorting',
      title: 'Incident Sorting Challenge',
      instructions: 'Drag each incident card into the correct category from the lesson.',
      config: {
        passing_score: 70,
        categories: [
          { id: 'clinical', label: 'Clinical' },
          { id: 'cyber', label: 'Cybersecurity' },
          { id: 'human', label: 'Human-Related' },
          { id: 'physical', label: 'Physical Security' },
          { id: 'operational', label: 'Operational' },
        ],
        category_guides: {
          clinical: {
            summary:
              'Clinical incidents occur during patient care and can affect safety and outcomes (medication errors, falls, etc.).',
            review_module_index: 1,
          },
          cyber: {
            summary:
              'Cybersecurity incidents threaten systems, networks, or electronic data (phishing, ransomware, unauthorized EHR access).',
            review_module_index: 1,
          },
          human: {
            summary:
              'Human-related incidents stem from mistakes, negligence, or misuse (wrong recipient, shared passwords, improper disposal).',
            review_module_index: 1,
          },
          physical: {
            summary:
              'Physical security incidents involve unauthorized access, lost devices, or safety risks in facilities.',
            review_module_index: 1,
          },
          operational: {
            summary:
              'Operational incidents disrupt normal healthcare operations (outages, equipment failure, workflow breakdowns).',
            review_module_index: 1,
          },
        },
        cards: [
          {
            id: 'c1',
            text: 'Giving a patient the wrong dosage',
            category_id: 'clinical',
            hint: 'Medication dosage errors directly affect patient safety and are clinical incidents.',
          },
          {
            id: 'c2',
            text: 'Clicking on a phishing email',
            category_id: 'cyber',
            hint: 'Phishing is a cybersecurity threat to systems and PHI.',
          },
          {
            id: 'c3',
            text: '3rd party contractor in a restricted area',
            category_id: 'physical',
            hint: 'Unauthorized access to restricted areas is a physical security incident.',
          },
          {
            id: 'c4',
            text: 'EHR system outage during peak hours',
            category_id: 'operational',
            hint: 'System downtime that disrupts care workflows is an operational incident.',
          },
          {
            id: 'c5',
            text: 'Patient information sent to the wrong person',
            category_id: 'human',
            hint: 'Misdirected PHI due to human error is a human-related incident.',
          },
          {
            id: 'c6',
            text: 'Patient fall with injury',
            category_id: 'clinical',
            hint: 'Patient falls with injury are clinical incidents because they harm patient safety.',
          },
        ],
      },
    },
    created_at: new Date().toISOString(),
  },
]
