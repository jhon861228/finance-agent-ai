variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project Name"
  default     = "finance-agent"
}

variable "telegram_bot_token" {
  description = "Telegram Bot Token"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "llm_provider" {
  description = "LLM Provider (bedrock, groq, openai)"
  type        = string
  default     = "bedrock"
}

variable "github_token" {
  description = "GitHub Personal Access Token for Amplify"
  type        = string
  sensitive   = true
}
