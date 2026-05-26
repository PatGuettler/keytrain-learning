-- Seed data for GuardianMD development
-- Run after creating auth users in Supabase dashboard, or use demo mode in app

INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Metro General Hospital');

-- Demo profiles (link to auth.users after signup)
-- Admin: admin@guardianmd.demo
-- Manager: manager@guardianmd.demo  
-- Employee: employee@guardianmd.demo

INSERT INTO courses (id, org_id, title, description, estimated_minutes, is_published, thumbnail_url) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Clinical Incident Reporting',
    'Learn to identify, classify, and report clinical incidents across your facility.',
    45,
    true,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Cybersecurity Awareness',
    'Protect patient data and hospital systems from phishing and social engineering.',
    30,
    true,
    null
  );

INSERT INTO modules (id, course_id, title, type, order_index, content) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'What is a Clinical Incident?',
    'lesson',
    0,
    '{
      "slides": [
        {
          "id": "slide_1",
          "heading": "What is a Clinical Incident?",
          "body": "A clinical incident is any event that could have or did harm a patient during care delivery. This includes medication errors, falls, wrong-site procedures, and near-misses.",
          "layout": "image-right",
          "illustration": {
            "key": "clinical_incident",
            "alt": "Clinical incident alert at point of care",
            "caption": "When in doubt, stop and report — patient safety comes first."
          }
        },
        {
          "id": "slide_2",
          "heading": "Why Reporting Matters",
          "body": "Timely reporting enables root cause analysis, prevents recurrence, and fulfills regulatory obligations. Non-reporting puts patients and the organization at risk.",
          "layout": "image-top",
          "illustration": {
            "key": "reporting",
            "alt": "Completed incident report with checkmark",
            "caption": "Reports feed quality improvement and compliance workflows."
          }
        }
      ]
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Incident Classification Quiz',
    'quiz',
    1,
    '{
      "passing_score": 80,
      "randomize_questions": true,
      "questions": [
        {
          "id": "q1",
          "text": "What type of incident is giving a patient the wrong dosage?",
          "type": "single_select",
          "options": [
            { "id": "a", "text": "Cybersecurity incident", "correct": false },
            { "id": "b", "text": "Clinical incident", "correct": true },
            { "id": "c", "text": "Physical infrastructure incident", "correct": false }
          ],
          "explanation": "Medication dosage errors directly affect patient safety and are classified as clinical incidents."
        },
        {
          "id": "q2",
          "text": "A water leak in the parking garage is best classified as:",
          "type": "single_select",
          "options": [
            { "id": "a", "text": "Clinical incident", "correct": false },
            { "id": "b", "text": "Physical / facilities incident", "correct": true },
            { "id": "c", "text": "Privacy breach", "correct": false }
          ],
          "explanation": "Facilities issues without direct patient harm are physical incidents, still reportable through facilities channels."
        }
      ]
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Hospital Floor Incident Map',
    'workshop',
    2,
    '{
      "workshop_type": "node_map",
      "title": "Identify the Incident Type",
      "instructions": "Explore the ward floor plan and tap each alert pin. Read the scenario and classify the incident.",
      "config": {
        "background_image": "",
        "nodes": [
          {
            "id": "node_1",
            "x_percent": 50,
            "y_percent": 38,
            "icon": "alert",
            "label": "Nurses Station",
            "scenario": "The EHR shows a patient chart accessed 12 times in one hour by a user not on the care team.",
            "question": {
              "text": "What type of incident is this?",
              "options": [
                { "id": "a", "text": "Clinical" },
                { "id": "b", "text": "Cybersecurity / Privacy" },
                { "id": "c", "text": "Physical / Facilities" }
              ],
              "correct_id": "b"
            }
          },
          {
            "id": "node_2",
            "x_percent": 81,
            "y_percent": 22,
            "icon": "alert",
            "label": "Room 204",
            "scenario": "A patient received double the prescribed dose of insulin.",
            "question": {
              "text": "What type of incident is this?",
              "options": [
                { "id": "a", "text": "Clinical" },
                { "id": "b", "text": "Cybersecurity" },
                { "id": "c", "text": "Administrative" }
              ],
              "correct_id": "a"
            }
          },
          {
            "id": "node_3",
            "x_percent": 12,
            "y_percent": 72,
            "icon": "alert",
            "label": "Pharmacy",
            "scenario": "Look-alike medication vials stored together; wrong drug nearly dispensed.",
            "question": {
              "text": "What type of incident is this?",
              "options": [
                { "id": "a", "text": "Clinical (medication safety)" },
                { "id": "b", "text": "Cybersecurity" },
                { "id": "c", "text": "Physical only" }
              ],
              "correct_id": "a"
            }
          },
          {
            "id": "node_4",
            "x_percent": 20,
            "y_percent": 88,
            "icon": "alert",
            "label": "Waiting Area",
            "scenario": "Visitor slipped on wet floor; no warning signage after mopping.",
            "question": {
              "text": "What type of incident is this?",
              "options": [
                { "id": "a", "text": "Clinical" },
                { "id": "b", "text": "Physical / Facilities" },
                { "id": "c", "text": "Administrative" }
              ],
              "correct_id": "b"
            }
          },
          {
            "id": "node_5",
            "x_percent": 73,
            "y_percent": 88,
            "icon": "alert",
            "label": "IT / EHR",
            "scenario": "Unlocked workstation with patient schedules visible during evacuation.",
            "question": {
              "text": "What type of incident is this?",
              "options": [
                { "id": "a", "text": "Clinical" },
                { "id": "b", "text": "Cybersecurity / Privacy" },
                { "id": "c", "text": "Physical" }
              ],
              "correct_id": "b"
            }
          }
        ]
      }
    }'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Sort Incidents by Category',
    'workshop',
    3,
    '{
      "workshop_type": "sorting",
      "title": "Incident Sorting Challenge",
      "instructions": "Drag each incident card into the correct category.",
      "config": {
        "categories": [
          { "id": "clinical", "label": "Clinical" },
          { "id": "cyber", "label": "Cybersecurity" },
          { "id": "physical", "label": "Physical" },
          { "id": "admin", "label": "Administrative" }
        ],
        "cards": [
          { "id": "c1", "text": "Wrong medication administered", "category_id": "clinical" },
          { "id": "c2", "text": "Phishing email clicked by staff", "category_id": "cyber" },
          { "id": "c3", "text": "Broken elevator strand patients", "category_id": "physical" },
          { "id": "c4", "text": "Missing consent form", "category_id": "admin" },
          { "id": "c5", "text": "Patient fall with injury", "category_id": "clinical" },
          { "id": "c6", "text": "Ransomware on workstation", "category_id": "cyber" }
        ]
      }
    }'::jsonb
  );
