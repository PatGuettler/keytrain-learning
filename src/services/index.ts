/**
 * Application API layer — the only module pages/hooks should import for data access.
 *
 * Layering:
 *   pages / hooks  →  services/*  →  backend (interface)  →  adapters (supabase, aws, …)
 *
 * Identity vs data:
 *   - auth.service      — sign-in, sign-out, session, password reset
 *   - users.service     — profile listing and admin profile updates
 *   - organizations.service — hospital/org CRUD
 *   - courses.service   — courses and modules
 *   - course-publications.service — publish/unpublish and notices
 *   - assignments.service — assignments, attempt limits, course results
 *   - unlock-requests.service — learner unlock workflow
 *   - sessions.service  — training sessions and module attempts
 */

export * from './auth.service'
export * from './users.service'
export * from './organizations.service'
export * from './courses.service'
export * from './course-publications.service'
export * from './assignments.service'
export * from './unlock-requests.service'
export * from './sessions.service'
export * from './phishing.service'
