//! Detección de ediciones de riesgo para snapshots Git automáticos (Fase 5).

/// Umbral de caracteres borrados en una sola operación que disparará snapshot (Fase 5).
pub const RISK_DELETE_CHAR_THRESHOLD: usize = 500;

/// Indica si el delta de longitud sugiere un borrado masivo. Stub para Fase 2.2.
pub fn is_risky_mass_delete(previous_len: usize, next_len: usize) -> bool {
    previous_len.saturating_sub(next_len) >= RISK_DELETE_CHAR_THRESHOLD
}
