import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  buildOrgSlugLookup,
  isOrgUuid,
  resolveOrgFromParam,
} from '@/lib/org-slugs'
import { fetchHospitalOrganizations } from '@/services/organizations.service'

/** Resolve :orgSlug route param to an organization; redirect legacy UUID URLs to slug paths. */
export function useOrgRoute() {
  const { orgSlug: orgParam } = useParams<{ orgSlug: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const lookup = useMemo(() => buildOrgSlugLookup(orgs), [orgs])
  const org = orgParam ? resolveOrgFromParam(orgParam, orgs) : undefined
  const orgId = org?.id
  const orgSlug = org ? lookup.slugById.get(org.id) : undefined

  useEffect(() => {
    if (!orgParam || !org || !orgSlug || orgParam === orgSlug) return
    if (isOrgUuid(orgParam)) {
      navigate(location.pathname.replace(orgParam, orgSlug), { replace: true })
    }
  }, [orgParam, org, orgSlug, location.pathname, navigate])

  return { org, orgId, orgSlug, orgs, isLoading, lookup }
}
