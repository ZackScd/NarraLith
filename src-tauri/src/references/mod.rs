//! Referencias cruzadas: menciones sin enlazar y conversión (Fase 3.4).

mod convert;
mod unlinked;

pub use convert::convert_unlinked_mention;
pub use unlinked::{
    find_unlinked_mentions, UnlinkedMentionRow, DEFAULT_UNLINKED_LIMIT,
};
