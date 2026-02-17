resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-frontend"
  repository = "https://github.com/jhon861228/finance-agent-ai"

  # Si usas un token de acceso personal (PAT) para GitHub
  access_token = var.github_token 

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
        baseDirectory: frontend/dist
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
  EOT

  custom_rule {
    source = "/<*>"
    status = "200"
    target = "/index.html"
  }

  # Regla para manejar rutas con extensiones (archivos estáticos)
  custom_rule {
    source = "/<*>.{js,css,png,jpg,jpeg,svg,gif,woff,woff2,ico,json}"
    status = "200"
    target = "/<*>.{js,css,png,jpg,jpeg,svg,gif,woff,woff2,ico,json}"
  }

  environment_variables = {
    ENV                = "prod"
    PUBLIC_BACKEND_URL = aws_apigatewayv2_stage.default.invoke_url
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"

  framework = "Astro"
  stage     = "PRODUCTION"
}
