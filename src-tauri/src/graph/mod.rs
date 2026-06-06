//! Grafo de conocimiento — indexación y consultas (Fase 8).

pub mod indexer;
pub mod query;
pub mod scheduler;

pub use indexer::rebuild_graph_edges;
pub use query::{get_graph_data, GraphData, GraphDataFilters};
pub use scheduler::GraphScheduler;
