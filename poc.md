Here is a production setup guide for KeyTrain Learning with Supabase (not demo mode). The app does not create users in the UI yet—users are created in Supabase Auth, then linked with a profiles row in SQL.

How the real system works (short)
Piece	What it does
Supabase Auth
Email + password login
profiles
Role (admin / manager / employee), org, and for employees manager_id
organizations
One hospital/org; everyone shares the same org_id
courses / modules
Training content; admin builds/publishes
assignments
Manager assigns a course to an employee (required for scores/sessions to save)
Login flow: sign in → load profiles row where id = Auth user UUID → redirect to role dashboard.

Phase 0 — Prerequisites
Supabase account: https://supabase.com
GitHub repo: https://github.com/PatGuettler/keytrain-learning
Live app (optional): https://keytrainlearning.com/
Phase 1 — Supabase project and database
1.1 Create project
Supabase → New project
Name it (e.g. keytrain-learning-prod)
Set a strong DB password and save it
Wait until the project is Active
1.2 Run the schema migration
SQL Editor → New query
Paste the full file:
supabase/migrations/001_initial_schema.sql
Run
Confirm no errors (tables: organizations, profiles, courses, modules, assignments, training_sessions, module_attempts)
1.3 Auth settings
Authentication → Providers → Email → enable
For testing, you can turn Confirm email off (easier first logins)
Authentication → URL configuration:
Site URL: https://keytrainlearning.com/
Redirect URLs (add both):
https://keytrainlearning.com/**
http://localhost:5173/**
1.4 Storage (optional, for lesson images)
Storage → New bucket → name: training-images
Set to Public (or private + policies if you prefer)
Used when course content references image URLs
1.5 API keys
Project Settings → API
Copy:
Project URL → VITE_SUPABASE_URL
anon public key → VITE_SUPABASE_ANON_KEY
Phase 2 — Organization (one hospital)
In SQL Editor:

INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Metro General Hospital')
ON CONFLICT (id) DO NOTHING;
Save this org_id — every user and course uses it.

(You can use another UUID; just use the same value everywhere below.)

Phase 3 — Admin (first user)
There is no admin until Auth user + profile exist. Do admin first.

3.1 Create Auth user
Authentication → Users → Add user → Create new user
Example:
Email: admin@yourhospital.org
Password: strong password (min 6 characters in app)
Auto Confirm User: ON (if email confirm is off, still helps)
Open the user → copy User UID (e.g. a1b2c3d4-....)
3.2 Create admin profile (SQL)
Replace PASTE_ADMIN_AUTH_UID with that UID:

INSERT INTO profiles (id, org_id, manager_id, full_name, role, is_active)
VALUES (
  'PASTE_ADMIN_AUTH_UID',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Alex Rivera',
  'admin',
  true
);
Rules for admin:

id = exact Auth User UID
role = 'admin'
manager_id = NULL
org_id = your organization UUID
3.3 Verify admin login (local)
Project root: copy .env.example → .env:
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
npm install → npm run dev
Open http://localhost:5173
Sign in as admin (demo buttons should not appear if env is set)
You should land on /admin/dashboard
Check Admin → Users — you should see your admin row
3.4 Production site (GitHub Pages)
GitHub repo → Settings → Secrets and variables → Actions
Add:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
Push to main (or re-run Deploy to GitHub Pages)
Sign in at https://keytrainlearning.com/
If secrets are missing, the live site stays in demo mode (demo login buttons).

Phase 4 — Manager
4.1 Create Auth user
Authentication → Users → Add user
Example:
Email: manager@yourhospital.org
Password: (set and share securely)
Copy User UID → PASTE_MANAGER_AUTH_UID
4.2 Create manager profile (SQL)
INSERT INTO profiles (id, org_id, manager_id, full_name, role, is_active)
VALUES (
  'PASTE_MANAGER_AUTH_UID',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Jordan Chen',
  'manager',
  true
);
Rules for manager:

Same org_id as admin
role = 'manager'
manager_id = NULL (managers are not “under” another manager in this app)
4.3 Verify manager
Sign out as admin
Sign in as manager@yourhospital.org
Should go to /manager/dashboard
Team may be empty until employees exist
Phase 5 — Employee(s)
Repeat for each staff member.

5.1 Create Auth user
Add user
Example:
Email: employee@yourhospital.org
Password: (set / send to employee)
Copy User UID → PASTE_EMPLOYEE_AUTH_UID
5.2 Create employee profile (SQL)
Critical: manager_id must be the manager’s Auth UID (same as manager’s profiles.id):

INSERT INTO profiles (id, org_id, manager_id, full_name, role, is_active)
VALUES (
  'PASTE_EMPLOYEE_AUTH_UID',
  '00000000-0000-0000-0000-000000000001',
  'PASTE_MANAGER_AUTH_UID',
  'Sam Taylor',
  'employee',
  true
);
If manager_id is wrong or NULL:

Manager Team list stays empty
Manager cannot assign training correctly
RLS may block manager views of that employee
5.3 Verify employee
Sign in as employee
Should go to /employee/dashboard
Training tab lists published courses for the org (may show “Pending” until assigned)
5.4 Multiple employees
For each new person:

Auth user → copy UID
INSERT INTO profiles with same org_id, same manager_id (manager UID), role = 'employee'
Phase 6 — Courses (admin)
Admin owns content.

Option A — Build in the app (recommended for your updated “Course 6” content)
Sign in as admin
Courses → New Course
Set title, description, check Published
Add modules: lesson / quiz / workshop
Save Course
(Your local demo-data.ts has the full Incident Awareness course; the GitHub seed.sql is older. Use the admin builder or import JSON via SQL if you want that exact content in production.)

Option B — Seed sample courses (SQL)
Run supabase/seed.sql in SQL Editor (org + 2 sample courses + modules)
Ensure org_id in seed matches your organization UUID
Admin can edit/publish in the UI afterward
Publish rule
Employees only see courses where is_published = true and org_id matches their org.
Draft courses are admin/manager only.
Phase 7 — Assign training (manager)
Assignments are required for progress and scores to save (training_sessions.assignment_id is a real foreign key; without an assignment the player uses a fake id and Supabase inserts fail).

Sign in as manager
Go to Assignments (or assign flow from team)
Employee: pick the employee (only appears if manager_id points to this manager)
Course: pick a published course
Click Assign Course
This creates a row in assignments with status = 'pending'.

Optional SQL (due date):

UPDATE assignments
SET due_date = '2026-06-01'
WHERE user_id = 'PASTE_EMPLOYEE_AUTH_UID'
  AND course_id = 'PASTE_COURSE_UUID';
Phase 8 — Employee completes training
Sign in as employee
Training → Start on assigned course
Complete lessons / quiz / workshops
Scores write to module_attempts and training_sessions when they finish
Assignment status moves toward in_progress / completed (on course finish)
Phase 9 — Verify data and dashboards
In Supabase (Table Editor)
Table	What to check
profiles
3 users, correct roles and manager_id on employee
assignments
Row linking employee + course
training_sessions
Row after employee starts course
module_attempts
Rows per module with score
In the app
Role	Where to look
Manager
Team → employee → assignments / progress
Admin
Users (list only today), Courses
Employee
Profile, Training, completion screen
Note: Admin dashboard “total users” may show 0 in Supabase mode (stats hook is still demo-oriented); use User Management or Supabase tables for real counts.

Role checklist (copy-paste)
Step	Admin	Manager	Employee
Auth user in Supabase
✅
✅
✅
profiles row
✅ role=admin
✅ role=manager
✅ role=employee
org_id
same org
same org
same org
manager_id
NULL
NULL
manager’s UID
Creates courses
✅
❌
❌
Assigns courses
✅ (RLS allows)
✅
❌
Takes training
optional
optional
✅ (needs assignment)
Common failures
Symptom	Fix
“Invalid credentials” / no profile
Missing or wrong profiles row; id must match Auth UID
Redirect to wrong dashboard
Wrong role in profiles
Manager sees no team
Employee manager_id ≠ manager’s UID
Employee sees no courses
Course not published or wrong org_id
Training runs but scores don’t save
No assignment for that employee + course
Live site still shows demo logins
Add VITE_SUPABASE_* to GitHub Actions secrets and redeploy
Login works locally, not on Pages
Supabase Site URL / Redirect URLs must include `https://keytrainlearning.com/**`
Suggested first-time order (30–60 min)
Migration + org
Admin Auth + profile → login
.env + local test
GitHub secrets + deploy
Manager Auth + profile
Employee Auth + profile (with manager UID)
Admin: create/publish one course
Manager: assign course to employee
Employee: complete course → check training_sessions in Supabase
What’s not in the app yet
User Management is view-only; the UI says production user creation should use Supabase Auth + SQL (or a future Edge Function with auth.admin.createUser).
Invite-by-email and self-signup with role are not implemented.
If you want, we can add a short “Production setup” section to the README or a docs/SETUP.md with these steps and SQL templates.

And this is all free?

Mostly yes for a small pilot or internal training rollout — but “free” has limits. Here’s how it breaks down for your setup (Supabase + GitHub Pages).

Free today
Service	Free tier (typical)	What you use it for
GitHub (public repo)
Free
Code, Actions deploy to Pages
GitHub Pages
Free on public repos
Hosting the React app
Supabase
Free tier
Auth, Postgres, RLS, storage
So for one hospital org, a handful of admins/managers, and tens to low hundreds of employees doing occasional training, you can run this without paying if you stay within limits.

Supabase free tier (what matters)
Rough limits (check Supabase pricing — they change):

Database size — capped (on the order of hundreds of MB on free)
Monthly active users (Auth) — capped (often ~50k MAU on free; far more than you need for a single org)
API / bandwidth — capped
Storage — limited GB for files (lesson images)
Project pauses — inactive free projects can auto-pause after a period; you wake them in the dashboard
No dedicated support / SLA — fine for demos and pilots, not for mission-critical production without a paid plan
For KeyTrain Learning specifically:

Text/JSON course content in Postgres is light
Auth logins for staff are low volume compared to consumer apps
Training images in Storage are the main thing that can grow
GitHub Actions / Pages
Public repo: Pages hosting is free; Actions minutes are generous for a simple npm ci + build on each push
If the repo were private, you’d use Actions minutes from your GitHub plan (still often enough for small teams)
What is not included (you still pay for)
Custom domain — optional; domain registrar costs money (Pages hosting can still be free)
Email — Supabase can send auth emails on free tier with limits; heavy transactional email may need another provider
Compliance / HIPAA — free Supabase is not “HIPAA BAA included”; real healthcare production with PHI often needs paid/enterprise and legal review (your app stores training data, not full PHI by default, but org policy still matters)
Your time — admin setup in Supabase dashboard + SQL (as in the guide)
When you’d need to pay
Consider Supabase Pro (or similar) if you need:

No project pausing, higher DB/storage/bandwidth
More environments (staging + prod)
Backups / point-in-time recovery expectations
Higher support or compliance offerings
Many concurrent users or large media libraries
GitHub might cost money if you need private repo + advanced org features — not required for the public Pages setup you have now.

Bottom line
Yes — you can run KeyTrain Learning for real users on Supabase free + GitHub Pages free for a small-to-medium internal training program.
No — it’s not “unlimited forever”; watch Supabase quotas, project pause, and storage for images.
Demo mode on the live site without Supabase secrets is free forever but uses fake data only.
If you tell me roughly how many users and whether you’ll host lots of images, I can ballpark whether you’d likely stay on free tier for a year or hit limits quickly.

