use std::path::PathBuf;

use anyhow::Result;
use async_trait::async_trait;
use clawhive_provider::ToolDef;

use crate::skill::SkillRegistry;
use crate::tool::{ToolContext, ToolExecutor, ToolOutput};

pub struct SkillTool {
    skills_root: PathBuf,
}

impl SkillTool {
    pub fn new(skills_root: PathBuf) -> Self {
        Self { skills_root }
    }
}

#[async_trait]
impl ToolExecutor for SkillTool {
    fn definition(&self) -> ToolDef {
        ToolDef {
            name: "skill".into(),
            description: "Read the full instructions for an available skill. Pass the skill name from the Available Skills list in the system prompt to get its complete SKILL.md content.".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the skill to read (from Available Skills list)"
                    }
                },
                "required": ["name"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, _ctx: &ToolContext) -> Result<ToolOutput> {
        let name = input["name"].as_str().unwrap_or("").trim();

        if name.is_empty() {
            return Ok(ToolOutput {
                content: "Error: skill name is required.".into(),
                is_error: true,
            });
        }

        let registry = SkillRegistry::load_from_dir(&self.skills_root).unwrap_or_default();
        match registry.get(name) {
            Some(skill) => Ok(ToolOutput {
                content: skill.content.clone(),
                is_error: false,
            }),
            None => {
                let available: Vec<_> = registry
                    .available()
                    .iter()
                    .map(|s| s.name.clone())
                    .collect();
                let list = if available.is_empty() {
                    "No skills are currently available.".to_string()
                } else {
                    format!("Available skills: {}", available.join(", "))
                };
                Ok(ToolOutput {
                    content: format!("Skill '{name}' not found. {list}"),
                    is_error: true,
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tool::{ToolContext, ToolExecutor};
    use std::fs;

    fn create_test_skills_dir() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        let weather_dir = dir.path().join("weather");
        fs::create_dir_all(&weather_dir).unwrap();
        fs::write(
            weather_dir.join("SKILL.md"),
            "---\nname: weather\ndescription: Get weather forecasts\n---\n\n# Weather Skill\n\nUse `curl wttr.in` to get weather.",
        )
        .unwrap();
        dir
    }

    #[tokio::test]
    async fn execute_returns_skill_content() {
        let dir = create_test_skills_dir();
        let tool = SkillTool::new(dir.path().to_path_buf());
        let ctx = ToolContext::builtin();
        let input = serde_json::json!({"name": "weather"});
        let output = tool.execute(input, &ctx).await.unwrap();
        assert!(!output.is_error);
        assert!(output.content.contains("# Weather Skill"));
        assert!(output.content.contains("curl wttr.in"));
    }

    #[tokio::test]
    async fn execute_returns_error_for_unknown_skill() {
        let dir = create_test_skills_dir();
        let tool = SkillTool::new(dir.path().to_path_buf());
        let ctx = ToolContext::builtin();
        let input = serde_json::json!({"name": "nonexistent"});
        let output = tool.execute(input, &ctx).await.unwrap();
        assert!(output.is_error);
        assert!(output.content.contains("not found"));
        assert!(output.content.contains("weather"));
    }

    #[tokio::test]
    async fn definition_has_correct_schema() {
        let dir = create_test_skills_dir();
        let tool = SkillTool::new(dir.path().to_path_buf());
        let def = tool.definition();
        assert_eq!(def.name, "skill");
        assert!(def.description.contains("skill"));
        let required = def.input_schema["required"].as_array().unwrap();
        assert!(required.iter().any(|v| v == "name"));
    }
}
