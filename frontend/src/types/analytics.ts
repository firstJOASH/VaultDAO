/**
 * Analytics dashboard types and time ranges.
 */

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ProposalTrendPoint {
  date: string; // YYYY-MM-DD
  created: number;
  approved: number;
  executed: number;
}

export interface SpendingSlice {
  name: string; // token symbol or address
  value: number;
  count?: number;
}

export interface SignerActivityCell {
  signer: string;
  period: string; // e.g. "2024-W01" or "Jan 1"
  count: number;
}

export interface TreasuryBalancePoint {
  date: string;
  [token: string]: string | number; // token symbol -> balance
}

export interface AggregatedAnalytics {
  proposalTrends: ProposalTrendPoint[];
  spendingByToken: SpendingSlice[];
  signerActivity: SignerActivityCell[];
  treasuryBalance: TreasuryBalancePoint[];
  approvalRate: number; // 0-100
  averageApprovalTimeHours: number;
  mostActiveSigner: string;
  topRecipient: string;
  totalVolume: number;
  pendingCount: number;
  dailyLimitUsedPercent?: number;
}

/** Minimal activity-like shape for aggregation (from events or mock). */
export interface ActivityLike {
  id: string;
  type: string;
  timestamp: string;
  actor: string;
  details: Record<string, unknown>;
}
