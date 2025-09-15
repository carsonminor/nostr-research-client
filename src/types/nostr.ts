export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UnsignedNostrEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  '#e'?: string[];
  '#p'?: string[];
  '#a'?: string[];
  '#d'?: string[];
}

export interface ResearchPaper {
  id: string;
  event_id: string;
  title: string;
  authors: string[];
  abstract: string;
  content?: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'published';
  created_at: Date;
  published_at?: Date;
  size_bytes: number;
  payment_hash?: string;
  price_paid?: number;
  reviewer_notes?: string;
}

export interface RelayInfo {
  name: string;
  description: string;
  pubkey?: string;
  contact?: string;
  supported_nips: number[];
  software: string;
  version: string;
  limitation?: {
    max_message_length: number;
    max_subscriptions: number;
    max_filters: number;
    max_limit: number;
    max_subid_length: number;
    max_event_tags: number;
    max_content_length: number;
    min_pow_difficulty: number;
    auth_required: boolean;
    payment_required: boolean;
    restricted_writes: boolean;
  };
  payments_url?: string;
  fees?: {
    admission: Array<{ amount: number; unit: string }>;
    subscription: Array<{ amount: number; unit: string }>;
    publication: Array<{
      kinds: number[];
      amount: number;
      unit: string;
      period?: number;
    }>;
  };
  pricing?: {
    price_per_mb_year: number;
    price_per_comment_mb: number;
    max_content_size: number;
    storage_available_mb: number;
  };
}

export interface RelayConnection {
  url: string;
  info?: RelayInfo;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  websocket?: WebSocket;
  subscriptions: Map<string, NostrFilter[]>;
}

export interface LightningInvoice {
  payment_request: string;
  payment_hash: string;
  amount_sats: number;
  expires_at: Date;
  description: string;
  paid?: boolean;
  settled_at?: Date;
}

export interface PricingInfo {
  amount_sats: number;
  size_mb: number;
  duration_years: number;
  description: string;
}

export interface PublishingRelayOption {
  url: string;
  name: string;
  pricing: PricingInfo;
  selected: boolean;
  invoice?: LightningInvoice;
  paid: boolean;
}