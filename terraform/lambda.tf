resource "aws_lambda_function" "telegram_handler" {
  function_name    = "${var.project_name}-telegram-handler"
  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
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
  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/handlers/ApiHandler.handler"
  runtime          = "nodejs22.x"
  timeout          = 30

  environment {
    variables = {
      EVENT_STORE_TABLE = aws_dynamodb_table.event_store.name
      READ_MODELS_TABLE = aws_dynamodb_table.read_models.name
      API_KEY           = var.frontend_api_key
      JWT_SECRET        = "finance-agent-ai-secret-key-for-jwt"
    }
  }
}

resource "aws_lambda_function" "command_processor" {
  function_name    = "${var.project_name}-command-processor"
  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
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
  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
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
  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
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

# CloudWatch Log Groups with 3-day retention
resource "aws_cloudwatch_log_group" "telegram_handler_logs" {
  name              = "/aws/lambda/${aws_lambda_function.telegram_handler.function_name}"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "finance_api_logs" {
  name              = "/aws/lambda/${aws_lambda_function.finance_api.function_name}"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "command_processor_logs" {
  name              = "/aws/lambda/${aws_lambda_function.command_processor.function_name}"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "event_stream_processor_logs" {
  name              = "/aws/lambda/${aws_lambda_function.event_stream_processor.function_name}"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "llm_parser_logs" {
  name              = "/aws/lambda/${aws_lambda_function.llm_parser.function_name}"
  retention_in_days = 3
}

