resource "aws_apigatewayv2_api" "telegram_api" {
  name          = "${var.project_name}-telegram-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.telegram_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "telegram_lambda" {
  api_id           = aws_apigatewayv2_api.telegram_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.telegram_handler.invoke_arn
}

resource "aws_apigatewayv2_route" "telegram_route" {
  api_id    = aws_apigatewayv2_api.telegram_api.id
  route_key = "POST /webhook"
  target    = "integrations/${aws_apigatewayv2_integration.telegram_lambda.id}"
}

# Catch-all route for the Express app
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.telegram_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.telegram_lambda.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.telegram_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.telegram_api.execution_arn}/*/*"
}

output "api_gateway_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}
