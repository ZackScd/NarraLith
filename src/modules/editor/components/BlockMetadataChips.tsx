interface BlockMetadataChipsProps {
  nodeKey: string;
}

/** @deprecated Fase 4 — `BlockMetadataNode` ya no se hidrata; chips inline vía `InlineTimeTagNode`. */
export function BlockMetadataChips({ nodeKey: _nodeKey }: BlockMetadataChipsProps) {
  void _nodeKey;
  return null;
}
