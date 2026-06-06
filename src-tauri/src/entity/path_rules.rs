//! Reglas de ruta para fichas de worldbuilding (Fase 4.1).

use crate::error::AppError;

/// `.md` bajo `Worldbuilding/`, excluyendo metadatos de carpeta.
pub fn is_entity_relative_path(relative: &str) -> bool {
    let normalized = relative.replace('\\', "/");
    let lower = normalized.to_lowercase();
    lower.starts_with("worldbuilding/")
        && lower.ends_with(".md")
        && !lower.ends_with(".folder.md")
}

pub fn ensure_entity_path(relative: &str) -> Result<(), AppError> {
    if !relative.to_lowercase().ends_with(".md") {
        return Err(AppError::new("error.entity.not_md"));
    }
    if !is_entity_relative_path(relative) {
        return Err(AppError::new("error.entity.not_worldbuilding"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entity_path_under_worldbuilding() {
        assert!(is_entity_relative_path(
            "Worldbuilding/Personajes/Principal/Hero.md"
        ));
    }

    #[test]
    fn manuscript_is_not_entity() {
        assert!(!is_entity_relative_path("Manuscrito/Escena_1.md"));
    }

    #[test]
    fn folder_meta_is_not_entity() {
        assert!(!is_entity_relative_path("Worldbuilding/Personajes/.folder.md"));
    }
}
