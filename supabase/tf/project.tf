# Import existing production project into state (do not recreate).
# See migrateToTfInstruction.md Step 5.
import {
  to = supabase_project.production
  id = var.project_ref
}

resource "supabase_project" "production" {
  organization_id   = var.organization_id
  name              = var.project_name
  region            = var.project_region
  database_password = var.database_password

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [database_password]
  }
}

# Project settings (API + Auth). Values below are KeyTrain defaults; refine
# after dumping live settings (migrateToTfInstruction.md Step 4).
resource "supabase_settings" "production" {
  project_ref = supabase_project.production.id

  api = jsonencode({
    db_schema            = var.api_db_schema
    db_extra_search_path = var.api_db_extra_search_path
    max_rows             = var.api_max_rows
  })

  auth = jsonencode({
    site_url = var.auth_site_url
    uri_allow_list = join(",", var.auth_additional_redirect_urls)
  })
}
