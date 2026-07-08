-- Server Room Security & Cyber Safety — full course + modules
-- Run in Supabase SQL Editor (after migrations 001+).
-- Safe to re-run: uses ON CONFLICT upserts.
--
-- Courses require org_id. Platform-built library courses belong to Platform Administration
-- (same org as platform admin profiles). Publish to customer orgs via Admin → Course → Publish.

INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000099', 'Platform Administration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (
  id,
  org_id,
  title,
  description,
  estimated_minutes,
  max_attempts,
  certificate_enabled,
  is_published,
  thumbnail_url
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000099',
  'Server Room Security & Cyber Safety',
  'Protect critical infrastructure: physical access, environmental awareness, and cyber hygiene for staff who work near or support data center spaces.',
  45,
  3,
  true,
  false,
  null
) ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  estimated_minutes = EXCLUDED.estimated_minutes,
  max_attempts = EXCLUDED.max_attempts,
  certificate_enabled = EXCLUDED.certificate_enabled,
  updated_at = now();

DELETE FROM modules WHERE course_id = '10000000-0000-0000-0000-000000000003';

INSERT INTO modules (id, course_id, title, type, order_index, content) VALUES
  (
    '20000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000003',
    'Why Server Rooms Matter',
    'lesson',
    0,
    '{
      "slides": [
        {
          "id": "sr_slide_1",
          "heading": "Critical infrastructure behind the scenes",
          "body": "Server rooms and data centers power email, payroll, customer records, and day-to-day operations. A breach or outage here can affect **every team** in your organization—not just IT.\n\nEvery employee has a role in protecting these spaces, even if you rarely enter them.",
          "layout": "image-right",
          "illustration": { "key": "cybersecurity", "alt": "Cybersecurity and data protection", "caption": "" }
        },
        {
          "id": "sr_slide_2",
          "heading": "What is at risk?",
          "body": "- **Confidential data** — customer, employee, and business information\n- **Service availability** — downtime stops work across the org\n- **Physical safety** — power, cooling, and fire hazards\n- **Compliance** — many industries require controlled access and audit trails",
          "layout": "image-left",
          "illustration": { "key": "reporting", "alt": "Security checklist", "caption": "" }
        }
      ]
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000003',
    'Physical Access & Visitor Control',
    'lesson',
    1,
    '{
      "slides": [
        {
          "id": "sr_slide_3",
          "heading": "Access control basics",
          "body": "Server rooms should use **badge access**, **mantraps** or two-door entry where possible, and **no tailgating**. If someone holds the door without badging in, politely ask them to use their own credential or escort them through the proper process.",
          "layout": "image-right",
          "illustration": { "key": "stop_report", "alt": "Stop and report security issues", "caption": "" }
        },
        {
          "id": "sr_slide_4",
          "heading": "Visitors and vendors",
          "body": "All visitors must be **escorted**, **logged**, and given **temporary badges** that are collected on exit. Never leave a vendor alone in a server room—even for \"quick maintenance.\"\n\nReport propped-open doors, unknown persons, or missing signage immediately to IT or security.",
          "layout": "image-top",
          "illustration": { "key": "team_safety", "alt": "Team safety and awareness", "caption": "" }
        }
      ]
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000003',
    'Cyber Hygiene in Technical Spaces',
    'lesson',
    2,
    '{
      "slides": [
        {
          "id": "sr_slide_5",
          "heading": "Workstations and removable media",
          "body": "Do not plug personal phones, USB drives, or unapproved laptops into server room equipment. Use only **organization-approved** tools and change-management processes for updates.\n\nLock screens when stepping away—even inside a restricted area.",
          "layout": "image-right",
          "illustration": { "key": "cybersecurity", "alt": "Secure workstation practices", "caption": "" }
        },
        {
          "id": "sr_slide_6",
          "heading": "Cables, environment, and reporting",
          "body": "- Keep cable trays neat; report tripping hazards or exposed power\n- Never block CRAC vents or fire suppression nozzles\n- Report **high temperature**, **water leaks**, **smoke**, or **strange odors** immediately\n- Use the org incident channel—not social media",
          "layout": "full-bleed",
          "illustration": { "key": "reporting", "alt": "Incident reporting", "caption": "" }
        }
      ]
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000003',
    'Server Room Security Map',
    'workshop',
    3,
    '{
      "workshop_type": "node_map",
      "title": "Server Room Security Walkthrough",
      "instructions": "Explore the server room floor plan and tap each alert pin. Read each scenario and choose the best security response.",
      "config": {
        "background_image": "",
        "floor_plan": "server_room",
        "passing_score": 70,
        "nodes": [
          {
            "id": "sr_node_1",
            "x_percent": 50,
            "y_percent": 88,
            "icon": "alert",
            "label": "Entry door",
            "scenario": "You arrive to find the server room door propped open with a trash can. No one is visible inside.",
            "question": {
              "text": "What should you do first?",
              "options": [
                { "id": "a", "text": "Remove the prop, close the door, and report to IT/security" },
                { "id": "b", "text": "Enter quickly to check servers before closing" },
                { "id": "c", "text": "Ignore it—someone is probably working inside" }
              ],
              "correct_id": "a"
            }
          },
          {
            "id": "sr_node_2",
            "x_percent": 18,
            "y_percent": 42,
            "icon": "alert",
            "label": "Network wall",
            "scenario": "A patch panel port is labeled but an unknown laptop is plugged directly into the core switch.",
            "question": {
              "text": "What is the best action?",
              "options": [
                { "id": "a", "text": "Unplug it yourself without telling anyone" },
                { "id": "b", "text": "Report it immediately; do not use or move the device" },
                { "id": "c", "text": "Assume it is a vendor and leave it" }
              ],
              "correct_id": "b"
            }
          },
          {
            "id": "sr_node_3",
            "x_percent": 50,
            "y_percent": 38,
            "icon": "alert",
            "label": "Rack row A",
            "scenario": "A rack door is open and an unbadged person is taking photos of serial numbers on equipment.",
            "question": {
              "text": "What should you do?",
              "options": [
                { "id": "a", "text": "Ask if they need help and verify they are escorted/authorized" },
                { "id": "b", "text": "Take your own photos for reference" },
                { "id": "c", "text": "Walk away—they might be from IT" }
              ],
              "correct_id": "a"
            }
          },
          {
            "id": "sr_node_4",
            "x_percent": 91,
            "y_percent": 28,
            "icon": "alert",
            "label": "UPS room",
            "scenario": "The UPS panel shows a warning light and a burning smell is noticeable near the battery cabinet.",
            "question": {
              "text": "What is the correct response?",
              "options": [
                { "id": "a", "text": "Reset the UPS yourself to clear the alarm" },
                { "id": "b", "text": "Evacuate if needed and report to facilities/IT immediately" },
                { "id": "c", "text": "Wait until the next maintenance window" }
              ],
              "correct_id": "b"
            }
          },
          {
            "id": "sr_node_5",
            "x_percent": 91,
            "y_percent": 58,
            "icon": "alert",
            "label": "CRAC unit",
            "scenario": "The cooling unit is making loud grinding noise and the room temperature display reads 85°F (29°C).",
            "question": {
              "text": "What should you do?",
              "options": [
                { "id": "a", "text": "Report overheating risk to IT/facilities right away" },
                { "id": "b", "text": "Open the exterior door to cool the room" },
                { "id": "c", "text": "Continue work—servers can handle brief heat" }
              ],
              "correct_id": "a"
            }
          }
        ]
      }
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000014',
    '10000000-0000-0000-0000-000000000003',
    'Server Room Security Quiz',
    'quiz',
    4,
    '{
      "passing_score": 80,
      "randomize_questions": true,
      "questions": [
        {
          "id": "sr_q1",
          "text": "Who may enter a server room without an escort?",
          "type": "single_select",
          "options": [
            { "id": "a", "text": "Only authorized, badged personnel per org policy", "correct": true },
            { "id": "b", "text": "Any employee who knows the door code", "correct": false },
            { "id": "c", "text": "Vendors with a scheduled appointment", "correct": false }
          ],
          "explanation": "Visitors and vendors should be escorted and logged even with appointments."
        },
        {
          "id": "sr_q2",
          "text": "You find a server room door propped open. What is the best first step?",
          "type": "single_select",
          "options": [
            { "id": "a", "text": "Secure the door and report the issue", "correct": true },
            { "id": "b", "text": "Enter alone to inspect equipment", "correct": false },
            { "id": "c", "text": "Wait for the next shift to notice", "correct": false }
          ],
          "explanation": "Propped doors defeat access control—close and report immediately."
        },
        {
          "id": "sr_q3",
          "text": "Which items should never be plugged into production server equipment without approval?",
          "type": "multi_select",
          "options": [
            { "id": "a", "text": "Personal USB flash drives", "correct": true },
            { "id": "b", "text": "Organization-approved maintenance laptop", "correct": false },
            { "id": "c", "text": "Personal smartphones for charging", "correct": true },
            { "id": "d", "text": "Approved KVM console", "correct": false }
          ],
          "explanation": "Personal removable media and chargers introduce malware and policy violations."
        },
        {
          "id": "sr_q4",
          "text": "Tailgating through a badge reader is acceptable if you recognize the person.",
          "type": "single_select",
          "options": [
            { "id": "a", "text": "True", "correct": false },
            { "id": "b", "text": "False", "correct": true }
          ],
          "explanation": "Everyone must badge in individually; tailgating bypasses access logs."
        },
        {
          "id": "sr_q5",
          "text": "A burning smell near UPS batteries should be reported immediately.",
          "type": "single_select",
          "options": [
            { "id": "a", "text": "True", "correct": true },
            { "id": "b", "text": "False", "correct": false }
          ],
          "explanation": "Battery and power issues can escalate quickly—report and evacuate if needed."
        }
      ]
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000015',
    '10000000-0000-0000-0000-000000000003',
    'Sort Security Risks',
    'workshop',
    5,
    '{
      "workshop_type": "sorting",
      "title": "Classify Server Room Risks",
      "instructions": "Drag each scenario into the correct risk category.",
      "config": {
        "passing_score": 80,
        "categories": [
          { "id": "physical", "label": "Physical security" },
          { "id": "cyber", "label": "Cyber / data" },
          { "id": "environmental", "label": "Environmental" },
          { "id": "policy", "label": "Policy / process" }
        ],
        "cards": [
          { "id": "c1", "text": "Unbadged visitor in the server room", "category_id": "physical" },
          { "id": "c2", "text": "Unknown laptop on core switch", "category_id": "cyber" },
          { "id": "c3", "text": "CRAC failure and rising temperature", "category_id": "environmental" },
          { "id": "c4", "text": "Maintenance performed without change ticket", "category_id": "policy" },
          { "id": "c5", "text": "Tailgating through mantrap", "category_id": "physical" },
          { "id": "c6", "text": "Ransomware alert on management server", "category_id": "cyber" }
        ]
      }
    }'::jsonb
  );
