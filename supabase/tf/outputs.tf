output "project_ref" {
  description = "Supabase project reference ID."
  value       = supabase_project.production.id
}

output "project_name" {
  description = "Supabase project display name."
  value       = supabase_project.production.name
}

output "api_url" {
  description = "HTTPS API URL for the project."
  value       = "https://${supabase_project.production.id}.supabase.co"
}

output "terraform_boundary" {
  description = "What Terraform owns vs what stays on the Supabase CLI."
  value = {
    managed_by_terraform = [
      "supabase_project (import + metadata)",
      "supabase_settings (api / auth JSON)",
    ]
    managed_by_supabase_cli = [
      "SQL migrations (supabase/migrations/*.sql)",
      "Edge Functions (supabase/functions/*)",
      "Function secrets (supabase secrets set)",
      "Storage buckets / RLS defined in SQL migrations",
      "Auth email templates (dashboard or Management API)",
      "Custom SMTP (dashboard)",
    ]
  }
}
