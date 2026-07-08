terraform {
  required_version = ">= 1.5.0"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Optional remote state — enable when ready (S3, Terraform Cloud, etc.).
  # backend "s3" {
  #   bucket = "keytrain-terraform-state"
  #   key    = "supabase/production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# Prefer: export SUPABASE_ACCESS_TOKEN='sbp_...'
# Dashboard: https://supabase.com/dashboard/account/tokens
provider "supabase" {}
