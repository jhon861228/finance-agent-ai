resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-frontend"
  repository = "https://github.com/jhon861228/finance-agent-ai"

  # Si usas un token de acceso personal (PAT) para GitHub
  access_token = var.github_token 

  platform = "WEB_COMPUTE"

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd frontend && npm install
        build:
          commands:
            - cd frontend && npm run build
      artifacts:
        baseDirectory: frontend/.amplify-hosting
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
  EOT

  environment_variables = {
    ENV                  = "prod"
    PUBLIC_BACKEND_URL   = aws_apigatewayv2_stage.default.invoke_url
    _CUSTOM_IMAGE        = "amplify:al2023"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"

  framework = "Astro"
  stage     = "PRODUCTION"
}
