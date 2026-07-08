# ---------------------------------------------------------------------------
# Inputs — copy terraform.tfvars.example → terraform.tfvars (gitignored)
# ---------------------------------------------------------------------------

variable "organization_id" {
  type        = string
  description = "Supabase organization slug (Organization Settings → General → Organization slug)."
}

variable "project_ref" {
  type        = string
  description = "Existing project reference ID (e.g. rzrsudrdpnabpseatclm)."
  default     = "rzrsudrdpnabpseatclm"
}

variable "project_name" {
  type        = string
  description = "Display name of the Supabase project."
  default     = "KeyTrainLearning"
}

variable "project_region" {
  type        = string
  description = "Region of the existing project. Must match dashboard (import ignores recreate)."
  default     = "us-east-1"
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = <<-EOT
    Database password required by supabase_project schema.
    For an imported project this must not be changed in Terraform —
    lifecycle.ignore_changes is set. Use a placeholder in tfvars.
  EOT
  default     = "unused-on-import-do-not-change"
}

# ---------------------------------------------------------------------------
# API settings (PostgREST) — refine after Step 4 inventory in migrateToTfInstruction.md
# ---------------------------------------------------------------------------

variable "api_db_schema" {
  type        = string
  description = "Comma-separated schemas exposed by PostgREST."
  default     = "public,storage,graphql_public"
}

variable "api_db_extra_search_path" {
  type    = string
  default = "public,extensions"
}

variable "api_max_rows" {
  type    = number
  default = 1000
}

# ---------------------------------------------------------------------------
# Auth site / redirect settings managed via supabase_settings.auth JSON
# Keep in sync with supabase/config.toml [auth] when you adopt config push.
# ---------------------------------------------------------------------------

variable "auth_site_url" {
  type    = string
  default = "https://keytrainlearning.com"
}

variable "auth_additional_redirect_urls" {
  type = list(string)
  default = [
    "https://keytrainlearning.com/**",
    "https://keytrainlearning.com/accept-invite",
    "https://keytrainlearning.com/reset-password",
    "https://keytrainlearning.com/login",
    "https://keytrainlearning.com/join",
    "https://keytrainlearning.com/signup",
    "https://keytrainlearning.com/phishing-training",
    "http://localhost:5173/**",
    "http://localhost:3000/**",
  ]
}
