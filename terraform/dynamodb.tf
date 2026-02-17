resource "aws_dynamodb_table" "event_store" {
  name           = "${var.project_name}-events"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "aggregateId"
  range_key      = "timestamp"

  attribute {
    name = "aggregateId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Name        = "${var.project_name}-events"
    Environment = "dev"
  }
}

resource "aws_dynamodb_table" "read_models" {
  name           = "${var.project_name}-read-models"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  range_key      = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-read-models"
    Environment = "dev"
  }
}
