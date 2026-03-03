use std::collections::HashMap;

use chrono::{Duration, Utc};

use crate::skill_install::SkillAnalysisReport;

#[derive(Clone, Debug)]
pub struct PendingSkillInstall {
    pub source: String,
    pub report: SkillAnalysisReport,
    pub user_scope: String,
    pub conversation_scope: String,
    pub created_at: chrono::DateTime<Utc>,
}

pub struct SkillInstallState {
    ttl: Duration,
    skill_install_allowed_scopes: Option<Vec<String>>,
    pending: tokio::sync::Mutex<HashMap<String, PendingSkillInstall>>,
}

impl SkillInstallState {
    pub fn new(ttl_seconds: i64) -> Self {
        Self::with_allowed_scopes(ttl_seconds, None)
    }

    pub fn with_allowed_scopes(
        ttl_seconds: i64,
        skill_install_allowed_scopes: Option<Vec<String>>,
    ) -> Self {
        Self {
            ttl: Duration::seconds(ttl_seconds),
            skill_install_allowed_scopes,
            pending: tokio::sync::Mutex::new(HashMap::new()),
        }
    }

    pub async fn create_pending(
        &self,
        source: String,
        report: SkillAnalysisReport,
        user_scope: String,
        conversation_scope: String,
    ) -> String {
        let token = uuid::Uuid::new_v4().to_string();
        let pending = PendingSkillInstall {
            source,
            report,
            user_scope,
            conversation_scope,
            created_at: Utc::now(),
        };
        let mut lock = self.pending.lock().await;
        lock.insert(token.clone(), pending);
        token
    }

    pub async fn take_if_valid(&self, token: &str) -> Option<PendingSkillInstall> {
        let mut lock = self.pending.lock().await;
        let entry = lock.remove(token)?;
        let expired = Utc::now() - entry.created_at > self.ttl;
        if expired {
            return None;
        }
        Some(entry)
    }

    pub fn is_scope_allowed(&self, user_scope: &str) -> bool {
        match &self.skill_install_allowed_scopes {
            None => true,
            Some(allowed) => allowed.iter().any(|scope| scope == user_scope),
        }
    }
}
