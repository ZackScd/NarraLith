export interface ConsistencyPathRef {
  path: string;
  blockIndex: number;
  location?: string | null;
}

export interface ConsistencyIssue {
  id: string;
  kind: string;
  messageKey: string;
  severity: string;
  character: string;
  timestamp: string;
  rawTime: string;
  paths: ConsistencyPathRef[];
}
