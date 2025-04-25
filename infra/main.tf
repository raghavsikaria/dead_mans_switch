
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.3.0"
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table
resource "aws_dynamodb_table" "deadman_users" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }
}

# IAM Roles (separate roles for each Lambda)
resource "aws_iam_role" "handler_lambda_role" {
  name = "handler_lambda_execution_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role" "checker_lambda_role" {
  name = "checker_lambda_execution_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# IAM Policy Attachments
resource "aws_iam_role_policy_attachment" "handler_basic_execution" {
  role       = aws_iam_role.handler_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "checker_basic_execution" {
  role       = aws_iam_role.checker_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "checker_dynamodb_read" {
  role       = aws_iam_role.checker_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "checker_ses_access" {
  role       = aws_iam_role.checker_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSESFullAccess"
}

resource "aws_iam_role_policy_attachment" "handler_dynamodb_full" {
  role       = aws_iam_role.handler_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Lambda Layer for Firebase Admin SDK
# resource "aws_lambda_layer_version" "firebase_layer" {
#   filename         = var.firebase_layer_zip_path
#   layer_name       = "firebase_admin_layer"
#   compatible_runtimes = ["python3.11"]
# }

# Lambda Functions
resource "aws_lambda_function" "handler_lambda" {
  function_name = "DeadManSwitchHandlerTF"
  filename      = var.handler_zip_path
  source_code_hash = filebase64sha256(var.handler_zip_path)
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  role          = aws_iam_role.handler_lambda_role.arn

  environment {
    variables = {
      DYNAMODB_TABLE              = var.dynamodb_table_name
      SENDER_EMAIL                = var.sender_email
      FIREBASE_CLIENT_EMAIL       = var.firebase_client_email
      FIREBASE_PRIVATE_KEY        = var.firebase_private_key
      FIREBASE_PROJECT_ID         = var.firebase_project_id
      FIREBASE_CLIENT_ID          = var.firebase_client_id
      FIREBASE_PRIVATE_KEY_ID     = var.firebase_private_key_id
      FIREBASE_CLIENT_X509_CERT_URL = var.firebase_client_x509_cert_url
    }
  }

  # layers = [aws_lambda_layer_version.firebase_layer.arn]
}

resource "aws_lambda_function" "checker_lambda" {
  function_name = "DeadManSwitchCheckerTF"
  filename      = var.checker_zip_path
  source_code_hash = filebase64sha256(var.checker_zip_path)
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  role          = aws_iam_role.checker_lambda_role.arn

  environment {
    variables = {
      DYNAMODB_TABLE = var.dynamodb_table_name
      SENDER_EMAIL   = var.sender_email
    }
  }
}

# EventBridge Schedule for Checker Lambda
resource "aws_cloudwatch_event_rule" "hourly_checker" {
  name                = "HourlyCheckinRule"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "checker_target" {
  rule      = aws_cloudwatch_event_rule.hourly_checker.name
  target_id = "CheckerLambda"
  arn       = aws_lambda_function.checker_lambda.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.checker_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_checker.arn
}

# API Gateway
resource "aws_apigatewayv2_api" "http_api" {
  name          = "DeadManSwitchAPI"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://deadmans-switch-f8d02.web.app"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id             = aws_apigatewayv2_api.http_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.handler_lambda.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "handler_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigateway_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.handler_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
