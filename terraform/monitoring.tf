# GCP Cloud Monitoring Configuration for RxMatch
# Task 17: Monitoring and Alert Configuration

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "rxmatch"
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "alert_email_secondary" {
  description = "Secondary email address for critical alerts"
  type        = string
  default     = ""
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Notification Channels
resource "google_monitoring_notification_channel" "email_primary" {
  display_name = "Primary Alert Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }

  enabled = true
}

resource "google_monitoring_notification_channel" "email_secondary" {
  count        = var.alert_email_secondary != "" ? 1 : 0
  display_name = "Secondary Alert Email"
  type         = "email"

  labels = {
    email_address = var.alert_email_secondary
  }

  enabled = true
}

# Dashboard: Application Health
resource "google_monitoring_dashboard" "application_health" {
  dashboard_json = jsonencode({
    displayName = "RxMatch - Application Health"

    mosaicLayout = {
      columns = 12

      tiles = [
        # Service Availability
        {
          width  = 6
          height = 4
          widget = {
            title = "Service Availability (Uptime %)"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
              sparkChartView = {
                sparkChartType = "SPARK_LINE"
              }
            }
          }
        },

        # Request Rate
        {
          width  = 6
          height = 4
          widget = {
            title = "Requests Per Minute"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
              }]
              timeshiftDuration = "0s"
              yAxis = {
                label = "Requests/min"
                scale = "LINEAR"
              }
            }
          }
        },

        # Error Rate
        {
          width  = 6
          height = 4
          widget = {
            title = "Error Rate (4xx/5xx)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"4xx\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_RATE"
                        crossSeriesReducer = "REDUCE_SUM"
                      }
                    }
                  }
                  plotType = "LINE"
                  legendTemplate = "4xx Errors"
                },
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_RATE"
                        crossSeriesReducer = "REDUCE_SUM"
                      }
                    }
                  }
                  plotType = "LINE"
                  legendTemplate = "5xx Errors"
                }
              ]
              yAxis = {
                label = "Errors/min"
                scale = "LINEAR"
              }
            }
          }
        },

        # Response Time (Latency)
        {
          width  = 6
          height = 4
          widget = {
            title = "Response Time (p50, p95, p99)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_50"
                      }
                    }
                  }
                  plotType = "LINE"
                  legendTemplate = "p50"
                },
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_95"
                      }
                    }
                  }
                  plotType = "LINE"
                  legendTemplate = "p95"
                },
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_99"
                      }
                    }
                  }
                  plotType = "LINE"
                  legendTemplate = "p99"
                }
              ]
              yAxis = {
                label = "Milliseconds"
                scale = "LINEAR"
              }
            }
          }
        },

        # Container CPU Usage
        {
          width  = 4
          height = 4
          widget = {
            title = "CPU Utilization"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/container/cpu/utilizations\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                    }
                  }
                }
              }]
              yAxis = {
                label = "CPU %"
                scale = "LINEAR"
              }
            }
          }
        },

        # Container Memory Usage
        {
          width  = 4
          height = 4
          widget = {
            title = "Memory Utilization"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                    }
                  }
                }
              }]
              yAxis = {
                label = "Memory %"
                scale = "LINEAR"
              }
            }
          }
        },

        # Active Instances
        {
          width  = 4
          height = 4
          widget = {
            title = "Active Container Instances"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/container/instance_count\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
              }]
              yAxis = {
                label = "Instances"
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })
}

# Dashboard: API Performance
resource "google_monitoring_dashboard" "api_performance" {
  dashboard_json = jsonencode({
    displayName = "RxMatch - API Performance"

    mosaicLayout = {
      columns = 12

      tiles = [
        # Note: Custom metrics need to be logged from application
        # These are placeholder structures - actual implementation requires custom metrics
        {
          width  = 12
          height = 2
          widget = {
            title = "Custom API Metrics"
            text = {
              content = "To track OpenAI, RxNorm, and FDA API performance, implement custom metrics using Cloud Logging. See docs/monitoring/MONITORING.md for implementation details."
              format  = "MARKDOWN"
            }
          }
        },

        # Log-based metric example for API errors
        {
          width  = 6
          height = 4
          widget = {
            title = "Application Errors (from logs)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"logging.googleapis.com/user/error_count\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
              }]
            }
          }
        },

        # Request distribution
        {
          width  = 6
          height = 4
          widget = {
            title = "Request Distribution by Path"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\""
                    aggregation = {
                      alignmentPeriod    = "300s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                      groupByFields      = ["metric.labels.response_code_class"]
                    }
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}

# Dashboard: Database & Cache
resource "google_monitoring_dashboard" "database_cache" {
  dashboard_json = jsonencode({
    displayName = "RxMatch - Database & Cache"

    mosaicLayout = {
      columns = 12

      tiles = [
        {
          width  = 12
          height = 2
          widget = {
            title = "External Dependencies"
            text = {
              content = "PostgreSQL (Neon) and Redis (Upstash) are external services. Monitor them through their respective dashboards. Application-level cache metrics can be tracked via custom metrics."
              format  = "MARKDOWN"
            }
          }
        },

        # Connection errors from logs
        {
          width  = 6
          height = 4
          widget = {
            title = "Database Connection Errors"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"logging.googleapis.com/user/database_error_count\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
              }]
            }
          }
        },

        # Cache errors from logs
        {
          width  = 6
          height = 4
          widget = {
            title = "Redis Cache Errors"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"logging.googleapis.com/user/cache_error_count\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}

# Dashboard: Business Metrics
resource "google_monitoring_dashboard" "business_metrics" {
  dashboard_json = jsonencode({
    displayName = "RxMatch - Business Metrics"

    mosaicLayout = {
      columns = 12

      tiles = [
        {
          width  = 12
          height = 2
          widget = {
            title = "Business Metrics Setup"
            text = {
              content = "Track prescriptions processed, confidence scores, and manual review queue through custom metrics. Implement using Cloud Logging and log-based metrics."
              format  = "MARKDOWN"
            }
          }
        },

        # Prescriptions processed (custom metric)
        {
          width  = 6
          height = 4
          widget = {
            title = "Prescriptions Processed"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"logging.googleapis.com/user/prescription_processed_count\""
                    aggregation = {
                      alignmentPeriod    = "300s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
              }]
            }
          }
        },

        # Manual review queue (custom metric)
        {
          width  = 6
          height = 4
          widget = {
            title = "Manual Review Queue Size"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"logging.googleapis.com/user/review_queue_size\""
                    aggregation = {
                      alignmentPeriod    = "300s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                    }
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}

# Alert Policy: Service Down
resource "google_monitoring_alert_policy" "service_down" {
  display_name = "RxMatch - Service Down (CRITICAL)"
  combiner     = "OR"

  conditions {
    display_name = "Service unavailable for >2 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\""
      duration        = "120s"
      comparison      = "COMPARISON_LT"
      threshold_value = 0.01

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = concat(
    [google_monitoring_notification_channel.email_primary.id],
    var.alert_email_secondary != "" ? [google_monitoring_notification_channel.email_secondary[0].id] : []
  )

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "RxMatch service is not receiving requests. Check Cloud Run service status and logs."
    mime_type = "text/markdown"
  }
}

# Alert Policy: High Error Rate (Critical)
resource "google_monitoring_alert_policy" "high_error_rate_critical" {
  display_name = "RxMatch - High Error Rate >5% (CRITICAL)"
  combiner     = "OR"

  conditions {
    display_name = "Error rate >5% for 5 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\" AND (metric.labels.response_code_class=\"4xx\" OR metric.labels.response_code_class=\"5xx\")"
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = concat(
    [google_monitoring_notification_channel.email_primary.id],
    var.alert_email_secondary != "" ? [google_monitoring_notification_channel.email_secondary[0].id] : []
  )

  alert_strategy {
    auto_close = "3600s"
  }

  documentation {
    content   = "Error rate has exceeded 5%. Check application logs for error details. See RUNBOOK.md for troubleshooting steps."
    mime_type = "text/markdown"
  }
}

# Alert Policy: High Latency
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "RxMatch - High Latency >10s (CRITICAL)"
  combiner     = "OR"

  conditions {
    display_name = "P95 latency >10s for 5 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10000

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_primary.id]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "P95 latency has exceeded 10 seconds. Check for API slowdowns (OpenAI, RxNorm, FDA) or database issues."
    mime_type = "text/markdown"
  }
}

# Alert Policy: Elevated Error Rate (Warning)
resource "google_monitoring_alert_policy" "elevated_error_rate" {
  display_name = "RxMatch - Elevated Error Rate >2% (WARNING)"
  combiner     = "OR"

  conditions {
    display_name = "Error rate >2% for 10 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\" AND (metric.labels.response_code_class=\"4xx\" OR metric.labels.response_code_class=\"5xx\")"
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.02

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_primary.id]

  alert_strategy {
    auto_close = "3600s"
  }

  documentation {
    content   = "Error rate is elevated. Monitor for continued increase. May indicate API issues or invalid requests."
    mime_type = "text/markdown"
  }
}

# Alert Policy: Slow Response Time (Warning)
resource "google_monitoring_alert_policy" "slow_response_time" {
  display_name = "RxMatch - Slow Response Time >5s (WARNING)"
  combiner     = "OR"

  conditions {
    display_name = "P95 latency >5s for 10 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5000

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_primary.id]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "Response times are degraded. Check cache hit rates and external API performance."
    mime_type = "text/markdown"
  }
}

# Alert Policy: High Memory Usage (Warning)
resource "google_monitoring_alert_policy" "high_memory_usage" {
  display_name = "RxMatch - High Memory Usage >80% (WARNING)"
  combiner     = "OR"

  conditions {
    display_name = "Memory utilization >80% for 15 minutes"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\""
      duration        = "900s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.80

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_primary.id]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "Memory usage is high. Consider increasing container memory allocation or investigating memory leaks."
    mime_type = "text/markdown"
  }
}

# Outputs
output "dashboard_urls" {
  description = "URLs to access the monitoring dashboards"
  value = {
    application_health = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.application_health.id}?project=${var.project_id}"
    api_performance    = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.api_performance.id}?project=${var.project_id}"
    database_cache     = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.database_cache.id}?project=${var.project_id}"
    business_metrics   = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.business_metrics.id}?project=${var.project_id}"
  }
}

output "notification_channels" {
  description = "Notification channel IDs"
  value = {
    primary   = google_monitoring_notification_channel.email_primary.id
    secondary = var.alert_email_secondary != "" ? google_monitoring_notification_channel.email_secondary[0].id : null
  }
}
