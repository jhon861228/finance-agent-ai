# Archive file is used to zip the source code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "telegram_handler" {
  function_name    = "${var.project_name}-telegram-handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/handlers/TelegramHandler.handler"
  runtime          = "nodejs22.x"
  timeout          = 30

  environment {
    variables = {
      COMMAND_PROCESSOR_NAME = "${var.project_name}-command-processor"
      LLM_PARSER_NAME        = "${var.project_name}-llm-parser"
      TELEGRAM_BOT_TOKEN     = var.telegram_bot_token
      LLM_PROVIDER           = var.llm_provider
      GROQ_API_KEY           = var.groq_api_key
      EVENT_STORE_TABLE      = aws_dynamodb_table.event_store.name
      READ_MODELS_TABLE      = aws_dynamodb_table.read_models.name
    }
  }
}

resource "aws_lambda_function" "finance_api" {
  function_name    = "${var.project_name}-api"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/handlers/ApiHandler.handler"
  runtime          = "nodejs22.x"
  timeout          = 30

  environment {
    variables = {
      EVENT_STORE_TABLE = aws_dynamodb_table.event_store.name
      READ_MODELS_TABLE = aws_dynamodb_table.read_models.name
      API_KEY           = var.frontend_api_key
      # In a real app, generate a proper secret
      JWT_SECRET        = "finance-agent-ai-secret-key-for-jwt"
    }
  }
}

resource "aws_lambda_function" "command_processor" {
  function_name    = "${var.project_name}-command-processor"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/core/CommandProcessor.handler"
  runtime          = "nodejs22.x"
  timeout          = 30

  environment {
    variables = {
      EVENT_STORE_TABLE = aws_dynamodb_table.event_store.name
    }
  }
}

resource "aws_lambda_function" "event_stream_processor" {
  function_name    = "${var.project_name}-stream-processor"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/core/StreamProcessor.handler"
  runtime          = "nodejs22.x"
  timeout          = 60

  environment {
    variables = {
      READ_MODELS_TABLE = aws_dynamodb_table.read_models.name
    }
  }
}

resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn  = aws_dynamodb_table.event_store.stream_arn
  function_name     = aws_lambda_function.event_stream_processor.arn
  starting_position = "LATEST"
  batch_size        = 10
}

resource "aws_lambda_function" "llm_parser" {
  function_name    = "${var.project_name}-llm-parser"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/core/LlmParser.handler"
  runtime          = "nodejs22.x"
  timeout          = 60

  environment {
    variables = {
      GROQ_API_KEY = var.groq_api_key
      LLM_PROVIDER = var.llm_provider
    }
  }
}
