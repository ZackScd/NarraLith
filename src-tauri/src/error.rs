use serde::Serialize;

/// Error IPC serializable: el frontend traduce `key` vía i18n.
#[derive(Debug, Clone, Serialize)]
pub struct AppError {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl AppError {
    pub fn new(key: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            details: None,
        }
    }

    pub fn with_details(key: impl Into<String>, details: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            details: Some(details.into()),
        }
    }

    pub fn project_not_found() -> Self {
        Self::new("error.project.not_found")
    }

    pub fn project_not_open() -> Self {
        Self::new("error.project.not_open")
    }

    pub fn database(message: impl Into<String>) -> Self {
        Self::with_details("error.database.generic", message)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.key)
    }
}

impl std::error::Error for AppError {}
