use std::time::Duration;

use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::Serialize;

const WEBHOOK_TIMEOUT: Duration = Duration::from_secs(30);
const MAX_RETRIES: u32 = 2;
const RETRY_DELAY: Duration = Duration::from_secs(2);

#[derive(Debug, Serialize)]
pub struct WebhookPayload {
    pub schedule_id: String,
    pub status: String,
    pub response: Option<String>,
    pub error: Option<String>,
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,
    pub duration_ms: u64,
}

pub async fn deliver_webhook(url: &str, payload: &WebhookPayload) -> Result<()> {
    let client = Client::builder().timeout(WEBHOOK_TIMEOUT).build()?;

    let mut last_error = None;

    for attempt in 0..=MAX_RETRIES {
        if attempt > 0 {
            tokio::time::sleep(RETRY_DELAY * attempt).await;
        }

        match client
            .post(url)
            .header("Content-Type", "application/json")
            .header("User-Agent", "ClawhHive-Scheduler/1.0")
            .json(payload)
            .send()
            .await
        {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    return Ok(());
                }
                let body = resp.text().await.unwrap_or_default();
                if status.is_server_error() {
                    last_error = Some(anyhow!("webhook returned {}: {}", status, body));
                    continue;
                }
                return Err(anyhow!("webhook returned {}: {}", status, body));
            }
            Err(e) => {
                last_error = Some(anyhow!("webhook request failed: {e}"));
                continue;
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow!("webhook delivery failed after retries")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn webhook_payload_serializes_correctly() {
        let now = Utc::now();
        let payload = WebhookPayload {
            schedule_id: "test-job".into(),
            status: "ok".into(),
            response: Some("result text".into()),
            error: None,
            started_at: now,
            ended_at: now,
            duration_ms: 1500,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("test-job"));
        assert!(json.contains("result text"));
        assert!(json.contains("1500"));
    }

    #[test]
    fn webhook_payload_error_case() {
        let now = Utc::now();
        let payload = WebhookPayload {
            schedule_id: "fail-job".into(),
            status: "error".into(),
            response: None,
            error: Some("timeout after 300s".into()),
            started_at: now,
            ended_at: now,
            duration_ms: 300000,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("fail-job"));
        assert!(json.contains("timeout after 300s"));
        assert!(!json.contains("result text"));
    }
}
