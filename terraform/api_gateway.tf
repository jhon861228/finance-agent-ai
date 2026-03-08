resource "aws_apigatewayv2_api" "telegram_api" {
  name          = "${var.project_name}-telegram-api"
  protocol_type = "HTTP"
  # Use the X-API-Key header to select API keys
  api_key_selection_expression = "$request.header.x-api-key"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.telegram_api.id
  name        = "$default"
  auto_deploy = true
  
  # Default route throttling and API key requirement
  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
}


resource "aws_apigatewayv2_integration" "telegram_integration" {
  api_id           = aws_apigatewayv2_api.telegram_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.telegram_handler.invoke_arn
}

resource "aws_apigatewayv2_integration" "api_integration" {
  api_id           = aws_apigatewayv2_api.telegram_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.finance_api.invoke_arn
}

resource "aws_apigatewayv2_route" "telegram_route" {
  api_id    = aws_apigatewayv2_api.telegram_api.id
  route_key = "POST /webhook"
  target    = "integrations/${aws_apigatewayv2_integration.telegram_integration.id}"
}

// Note: API Gateway v2 resources for `api_key` and `route_settings` were removed
// because the current AWS provider in this repo does not support them.
// API key validation is implemented in the Express middleware in the Lambda.

# Catch-all route for the Express app
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.telegram_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.api_integration.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.finance_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.telegram_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "telegram_api_gateway" {
  statement_id  = "AllowTelegramExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.telegram_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.telegram_api.execution_arn}/*/*/webhook"
}

output "api_gateway_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}


