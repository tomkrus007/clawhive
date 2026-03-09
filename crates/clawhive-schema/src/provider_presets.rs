use serde::Serialize;

/// A known LLM provider preset.
#[derive(Debug, Clone, Serialize)]
pub struct ProviderPreset {
    pub id: &'static str,
    pub name: &'static str,
    pub api_base: &'static str,
    pub needs_key: bool,
    pub needs_base_url: bool,
    pub default_model: &'static str,
    pub models: &'static [&'static str],
}

pub const PROVIDER_PRESETS: &[ProviderPreset] = &[
    ProviderPreset {
        id: "anthropic",
        name: "Anthropic",
        api_base: "https://api.anthropic.com/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "claude-opus-4-6",
        models: &[
            "claude-opus-4-6",
            "claude-sonnet-4-6",
            "claude-opus-4-5",
            "claude-sonnet-4-5",
            "claude-haiku-4-5",
        ],
    },
    ProviderPreset {
        id: "openai",
        name: "OpenAI",
        api_base: "https://api.openai.com/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "gpt-5.2",
        models: &[
            "gpt-5.2",
            "gpt-5.2-pro",
            "gpt-5",
            "gpt-5-pro",
            "gpt-5-mini",
            "o3-pro",
        ],
    },
    ProviderPreset {
        id: "azure-openai",
        name: "Azure OpenAI",
        api_base: "https://<your-resource>.openai.azure.com/openai/v1",
        needs_key: true,
        needs_base_url: true,
        default_model: "gpt-5.3-codex",
        models: &[
            "gpt-5.3-codex",
            "gpt-5.2",
            "gpt-5.2-codex",
            "gpt-5.1-codex-max",
            "o3-pro",
        ],
    },
    ProviderPreset {
        id: "gemini",
        name: "Google Gemini",
        api_base: "https://generativelanguage.googleapis.com/v1beta",
        needs_key: true,
        needs_base_url: false,
        default_model: "gemini-2.5-pro",
        models: &["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
    },
    ProviderPreset {
        id: "deepseek",
        name: "DeepSeek",
        api_base: "https://api.deepseek.com/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "deepseek-chat",
        models: &["deepseek-chat", "deepseek-reasoner"],
    },
    ProviderPreset {
        id: "groq",
        name: "Groq",
        api_base: "https://api.groq.com/openai/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "llama-3.3-70b-versatile",
        models: &["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    },
    ProviderPreset {
        id: "ollama",
        name: "Ollama",
        api_base: "http://localhost:11434/v1",
        needs_key: false,
        needs_base_url: false,
        default_model: "llama3.2",
        models: &["llama3.2", "qwen2.5-coder", "mistral"],
    },
    ProviderPreset {
        id: "openrouter",
        name: "OpenRouter",
        api_base: "https://openrouter.ai/api/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "anthropic/claude-sonnet-4-6",
        models: &[
            "openai/gpt-5.3-codex",
            "anthropic/claude-opus-4-6",
            "google/gemini-2.5-pro",
            "openai/gpt-5.2",
        ],
    },
    ProviderPreset {
        id: "together",
        name: "Together AI",
        api_base: "https://api.together.xyz/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        models: &[
            "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            "meta-llama/Llama-4-Scout-17B-16E-Instruct",
        ],
    },
    ProviderPreset {
        id: "fireworks",
        name: "Fireworks AI",
        api_base: "https://api.fireworks.ai/inference/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        models: &[
            "accounts/fireworks/models/llama-v3p3-70b-instruct",
            "accounts/fireworks/models/llama4-scout-instruct-basic",
        ],
    },
    ProviderPreset {
        id: "qwen",
        name: "Qwen (Alibaba)",
        api_base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "qwen-max",
        models: &["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
    },
    ProviderPreset {
        id: "moonshot",
        name: "Moonshot AI",
        api_base: "https://api.moonshot.cn/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "moonshot-v1-128k",
        models: &["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
    },
    ProviderPreset {
        id: "zhipu",
        name: "Zhipu AI",
        api_base: "https://open.bigmodel.cn/api/paas/v4",
        needs_key: true,
        needs_base_url: false,
        default_model: "glm-4-plus",
        models: &["glm-4-plus", "glm-4-flash", "glm-4-long", "glm-4"],
    },
    ProviderPreset {
        id: "minimax",
        name: "MiniMax",
        api_base: "https://api.minimax.chat/v1",
        needs_key: true,
        needs_base_url: false,
        default_model: "MiniMax-Text-01",
        models: &["MiniMax-Text-01", "abab6.5s-chat"],
    },
    ProviderPreset {
        id: "volcengine",
        name: "Volcengine (Doubao)",
        api_base: "https://ark.cn-beijing.volces.com/api/v3",
        needs_key: true,
        needs_base_url: false,
        default_model: "doubao-pro-128k",
        models: &["doubao-pro-128k", "doubao-pro-32k", "doubao-lite-128k"],
    },
    ProviderPreset {
        id: "qianfan",
        name: "Baidu Qianfan",
        api_base: "https://qianfan.baidubce.com/v2",
        needs_key: true,
        needs_base_url: false,
        default_model: "ernie-4.0-8k",
        models: &["ernie-4.0-8k", "ernie-4.0-turbo-8k", "ernie-3.5-8k"],
    },
];

/// Look up a provider preset by id.
pub fn preset_by_id(id: &str) -> Option<&'static ProviderPreset> {
    PROVIDER_PRESETS.iter().find(|p| p.id == id)
}

/// Get model list for a provider id (with `provider_id/` prefix).
pub fn provider_models_for_id(provider_id: &str) -> Vec<String> {
    match preset_by_id(provider_id) {
        Some(p) => p
            .models
            .iter()
            .map(|m| format!("{}/{}", provider_id, m))
            .collect(),
        None => vec![],
    }
}
