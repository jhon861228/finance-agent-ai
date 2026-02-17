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
    status = "404-200"
    target = "/index.html"
  }

  environment_variables = {
    ENV = "prod"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"

  framework = "Astro"
  stage     = "PRODUCTION"
}
