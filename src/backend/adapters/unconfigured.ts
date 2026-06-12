import { BACKEND_NOT_CONFIGURED_MESSAGE } from '@/lib/backend-config'
import type { Backend } from '../types'

export function createUnconfiguredBackend(): Backend {
  const fail = async () => {
    throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE)
  }
  return {
    kind: 'unconfigured',
    auth: {
      signIn: fail,
      signOut: async () => {},
      fetchProfile: fail,
      resetPassword: fail,
      getSession: async () => null,
    },
    users: { fetchProfiles: fail, updateProfile: fail },
    organizations: {
      fetchOrganizations: fail,
      createOrganization: fail,
      updateOrganization: fail,
      deleteOrganization: fail,
    },
    courses: {
      fetchCourses: fail,
      fetchHospitalCourses: fail,
      fetchCourse: fail,
      fetchLearnerCourse: fail,
      fetchModules: fail,
      upsertCourse: fail,
      deleteCourse: fail,
      upsertModule: fail,
      deleteModule: fail,
      syncCourseModules: fail,
      fetchPublicationsForOrg: fail,
      fetchPublicationsForCourse: fail,
      publishCourseToOrg: fail,
      unpublishCourseFromOrg: fail,
      unpublishCourseEverywhere: fail,
      setCourseAvailability: fail,
      fetchUnacknowledgedNotices: fail,
      acknowledgeCourseNotice: fail,
    },
    assignments: {
      fetchAssignments: fail,
      syncRequiredAssignmentsForUser: fail,
      recordCourseAttemptResult: fail,
      requestCourseUnlock: fail,
      fetchUnlockRequests: fail,
      fetchPendingUnlockForAssignment: fail,
      resolveUnlockRequest: fail,
      createAssignment: fail,
      updateAssignment: fail,
      deleteAssignment: fail,
    },
    training: {
      startSession: fail,
      updateSessionTime: fail,
      completeSession: fail,
      saveModuleAttempt: fail,
      fetchSessions: fail,
      fetchOrgModuleAttempts: fail,
      fetchUserModuleAttempts: fail,
    },
  }
}
