//! Refactorización global del proyecto (Fase 3.3).

mod rename_entity;

pub use rename_entity::{
    refactor_wikilinks_if_stem_changed, replace_wikilinks_for_entity_name,
};
