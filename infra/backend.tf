terraform {
  backend "s3" {
    bucket         = "deadmanswitch-terraform-state"
    key            = "state/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock-table"
  }
}