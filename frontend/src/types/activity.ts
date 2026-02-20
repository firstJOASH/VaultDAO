/**
 * Activity feed types for vault events.
 */

export type VaultEventType =
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_ready'
  | 'proposal_executed'
  | 'proposal_rejected'
  | 'signer_added'
  | 'signer_removed'
  | 'config_updated'
  | 'initialized'
  | 'role_assigned'
  | 'unknown';

export interface VaultActivity {
  id: string;
  type: VaultEventType;
  timestamp: string; // ISO
  ledger: string;
  actor: string; // address
  details: Record<string, unknown>;
  txHash?: string;
  eventId: string;
  pagingToken?: string;
}

export interface VaultEventsFilters {
  eventTypes?: VaultEventType[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  actorAddress?: string;
}

export interface GetVaultEventsResult {
  activities: VaultActivity[];
  latestLedger: string;
  cursor?: string;
  hasMore: boolean;
}
