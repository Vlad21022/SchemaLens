import type { ConnectResponse, PathResult } from './types';

const BASE = '/api';

export async function connectDatabase(connectionString: string): Promise<ConnectResponse> {
  const res = await fetch(`${BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_string: connectionString }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function findPath(sourceId: string, targetId: string): Promise<PathResult> {
  const res = await fetch(`${BASE}/path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'No path found' }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}
