
variable "aws_region" {
  default = "us-east-1"
}

variable "dynamodb_table_name" {
  default = "DeadManSwitchUsers"
}

variable "handler_zip_path" {
  description = "Path to the zipped DeadManSwitchHandler code"
  type        = string
}

variable "checker_zip_path" {
  description = "Path to the zipped DeadManSwitchChecker code"
  type        = string
}

variable "firebase_layer_zip_path" {
  description = "Path to the zipped FirebaseLayer code"
  type        = string
}

variable "sender_email" {
  type = string
}

variable "firebase_client_email" {
  type = string
}

variable "firebase_private_key" {
  type = string
}

variable "firebase_project_id" {
  type = string
}

variable "firebase_client_id" {
  type = string
}

variable "firebase_private_key_id" {
  type = string
}

variable "firebase_client_x509_cert_url" {
  type = string
}