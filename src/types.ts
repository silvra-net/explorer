// Response shapes of the Helix node RPC.
//
// Derived from live responses of a 0.11.0 node, not from the Rust structs — the JSON is what
// this app actually receives, and the two have drifted before. Every field here was observed;
// anything the node may omit is typed optional rather than assumed present.

export interface NodeStatus {
  version: string;
  height: number;
  best_hash: string;
  peer_count: number;
  is_syncing: boolean;
  mempool_size: number;
  total_accounts: number;
  circulating_supply_hlx: number;
  total_burned_hlx: number;
  state_hash: string;
  state_height: number;
  p2p_port: number;
  p2p_public_addr: string | null;
  base_fee_per_byte: number;
  /** Present only while the node runs a faucet with enough balance to pay out. */
  faucet_topup_hlx?: number | null;
  /** Only sent while the node is behind; absent once caught up. */
  sync_target_height?: number | null;
}

/** A transaction as it appears inside a block listing — the compact view. */
export interface BlockTx {
  hash: string;
  from: string;
  to: string | null;
  amount_hlx: number;
  fee_hlx: number;
  nonce: number;
  tx_type: string;
  status: string;
}

export interface BlockSummary {
  height: number;
  hash: string;
  prev_hash: string;
  merkle_root: string;
  timestamp: number;
  validator: string;
  node_version: string;
  base_fee_per_byte: number;
  tx_count: number;
  transactions: BlockTx[];
}

/**
 * `/blocks/height/:n/header` — the same header plus `last_commit`, the set of validators whose
 * precommits finalized this block.
 *
 * This is the one field the block listing does not carry, and the reason this app fetches
 * headers separately: on a BFT chain the interesting question about a block is not only who
 * proposed it but who agreed. See `CoSignStrip`.
 */
export interface BlockHeader {
  height: number;
  hash: string;
  prev_hash: string;
  merkle_root: string;
  timestamp: number;
  validator: string;
  node_version: string;
  base_fee_per_byte: number;
  last_commit: string[];
}

/** `/transactions/:hash` — richer than the in-block view: splits the fee. */
export interface TxDetail extends BlockTx {
  block_height: number | null;
  block_hash: string | null;
  timestamp: number | null;
  fee_burned_hlx?: number;
  fee_to_validator_hlx?: number;
  /** Set when the node knows the transaction but it did not apply. */
  error?: string | null;
}

/** `/accounts/:a/transactions` — same shape as a block tx, plus where it landed. */
export interface HistoryTx extends BlockTx {
  block_height: number;
  block_hash: string;
  timestamp: number;
}

export interface Account {
  address: string;
  balance_hlx: number;
  nonce: number;
  staked_hlx: number;
  unbonding_stake_hlx: number;
  unbonding_unlock_height: number;
  unbonding_source: string | null;
  has_code: boolean;
  jailed_until: number | null;
  missed_blocks: number | null;
}

export interface Validator {
  address: string;
  active: boolean;
  tier: string;
  self_staked_hlx: number;
  delegated_stake_hlx: number;
  effective_stake_hlx: number;
  accepts_delegation: boolean;
  commission_bps: number | null;
  jailed_until: number | null;
  missed_blocks: number | null;
  probation_liveness_seen: boolean;
  /**
   * What this validator actually weighs in a vote, after the 1 % cap and the halving for
   * validators without personhood — added in node 0.11.1.
   *
   * Optional because nodes older than that do not send it, and because the two absent cases
   * mean different things: `undefined` is "this node cannot tell me", `null` is "not in the set
   * at all", and `0` is "in the set but carrying no weight" (a probationer). Collapsing any of
   * those into another would misreport the set.
   */
  voting_power?: number | null;
}

export interface ValidatorList {
  min_validator_stake_hlx: number;
  validators: Validator[];
  /** Sum of the set's voting power — node 0.11.1 and newer. */
  total_voting_power?: number;
  /** Power a block's precommits must carry to finalize it — node 0.11.1 and newer. */
  quorum_threshold?: number;
}

export interface GovParams {
  min_validator_stake_hlx: number;
  fuel_per_fee_unit: number;
}

export interface Proposal {
  id: number;
  [key: string]: unknown;
}

export interface MempoolInfo {
  pending_count: number;
  is_empty: boolean;
}

export interface Delegation {
  validator: string;
  amount_hlx: number;
  [key: string]: unknown;
}
