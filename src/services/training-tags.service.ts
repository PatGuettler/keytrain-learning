import { backend } from '@/backend'
import type { TrainingTag } from '@/types/training-tag.types'

export async function fetchTrainingTags(): Promise<TrainingTag[]> {
  return backend.trainingTags.fetchTags()
}

export async function createTrainingTag(name: string): Promise<TrainingTag> {
  return backend.trainingTags.createTag(name)
}

export async function updateTrainingTag(id: string, name: string): Promise<TrainingTag> {
  return backend.trainingTags.updateTag(id, name)
}

export async function deleteTrainingTag(id: string): Promise<void> {
  return backend.trainingTags.deleteTag(id)
}

export async function fetchCourseTagIds(courseId: string): Promise<string[]> {
  return backend.trainingTags.fetchCourseTagIds(courseId)
}

export async function setCourseTags(courseId: string, tagIds: string[]): Promise<void> {
  return backend.trainingTags.setCourseTags(courseId, tagIds)
}

export async function fetchOrgTagIds(orgId: string): Promise<string[]> {
  return backend.trainingTags.fetchOrgTagIds(orgId)
}

export async function setOrgTags(orgId: string, tagIds: string[]): Promise<void> {
  return backend.trainingTags.setOrgTags(orgId, tagIds)
}
