-- Allow trusted org switch / create RPCs to update the caller's profiles.org_id + role.
-- SECURITY DEFINER RPCs still run with the caller JWT, so guard_profile_sensitive_columns
-- was blocking create_organization_as_org_admin / switch_active_organization.

CREATE OR REPLACE FUNCTION guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_privileged_changed boolean;
  v_membership_ok boolean;
BEGIN
  -- Service role / auth schema triggers (no JWT)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_role := auth_user_role();

  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'manager' AND OLD.manager_id = auth.uid() AND NEW.id IS DISTINCT FROM auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts
       OR NEW.login_locked_at IS DISTINCT FROM OLD.login_locked_at
       OR NEW.password_upgrade_required IS DISTINCT FROM OLD.password_upgrade_required
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
    THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id = auth.uid() THEN
    v_privileged_changed :=
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.org_id IS DISTINCT FROM OLD.org_id
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts
      OR NEW.login_locked_at IS DISTINCT FROM OLD.login_locked_at
      OR NEW.password_upgrade_required IS DISTINCT FROM OLD.password_upgrade_required
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.manager_id IS DISTINCT FROM OLD.manager_id;

    IF v_privileged_changed THEN
      -- Permit switching active org/role only when it matches an active membership
      -- and no other privileged fields are being changed.
      SELECT EXISTS (
        SELECT 1
        FROM organization_memberships m
        WHERE m.user_id = auth.uid()
          AND m.org_id = NEW.org_id
          AND m.role::text = NEW.role::text
          AND m.is_active = true
      ) INTO v_membership_ok;

      IF v_membership_ok
         AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
         AND NEW.failed_login_attempts IS NOT DISTINCT FROM OLD.failed_login_attempts
         AND NEW.login_locked_at IS NOT DISTINCT FROM OLD.login_locked_at
         AND NEW.password_upgrade_required IS NOT DISTINCT FROM OLD.password_upgrade_required
         AND NEW.email IS NOT DISTINCT FROM OLD.email
         AND NEW.manager_id IS NOT DISTINCT FROM OLD.manager_id
         AND (
           NEW.org_id IS DISTINCT FROM OLD.org_id
           OR NEW.role IS DISTINCT FROM OLD.role
         )
      THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Not allowed to modify privileged profile fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
