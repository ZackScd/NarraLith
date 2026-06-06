//! Normalización de metadatos YAML antes de serializar.

use serde_json::{json, Map, Value};

/// Elimina claves vacías (strings vacíos, null, arrays vacíos).
pub fn sanitize_metadata(value: Value) -> Value {
    let Some(obj) = value.as_object() else {
        return json!({});
    };

    let mut out = Map::new();
    for (key, val) in obj {
        if is_empty_value(&val) {
            continue;
        }
        out.insert(key.clone(), val.clone());
    }

    // §1.4: en bloques evento el tiempo vive en barTags/inline, no en YAML genérico.
    let is_event = out
        .get("event")
        .and_then(|v| v.as_str())
        .is_some_and(|s| !s.trim().is_empty());
    if is_event {
        out.remove("time");
    }

    Value::Object(out)
}

fn is_empty_value(value: &Value) -> bool {
    match value {
        Value::Null => true,
        Value::String(s) => s.trim().is_empty(),
        Value::Array(arr) => arr.is_empty() || arr.iter().all(|v| matches!(v, Value::String(s) if s.trim().is_empty())),
        Value::Object(o) => o.is_empty(),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn strips_empty_strings() {
        let raw = json!({
            "time": "Day 1",
            "location": "",
            "event": null
        });
        let clean = sanitize_metadata(raw);
        assert_eq!(clean["time"], "Day 1");
        assert!(clean.get("location").is_none());
        assert!(clean.get("event").is_none());
    }

    #[test]
    fn event_metadata_drops_legacy_time_field() {
        let raw = json!({
            "event": "Batalla",
            "entity": "Worldbuilding/Eventos/b.md",
            "time": "10.1.0",
            "barTags": [{ "type": "time", "value": "10.1.0" }]
        });
        let clean = sanitize_metadata(raw);
        assert_eq!(clean["event"], "Batalla");
        assert!(clean.get("time").is_none());
        assert!(clean["barTags"].is_array());
    }
}
