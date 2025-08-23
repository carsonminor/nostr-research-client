import { RelayInfo, PricingInfo, LightningInvoice, ResearchPaper } from '@/types/nostr';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Relay information
  async getRelayInfo(): Promise<RelayInfo> {
    return this.request<RelayInfo>('/api/info');
  }

  // Pricing
  async calculatePricing(sizeBytes: number, durationYears: number = 1): Promise<PricingInfo> {
    return this.request<PricingInfo>('/api/pricing', {
      method: 'POST',
      body: JSON.stringify({
        size_bytes: sizeBytes,
        duration_years: durationYears,
      }),
    });
  }

  // Lightning invoices
  async createInvoice(eventId: string, sizeBytes: number, durationYears: number = 1): Promise<LightningInvoice> {
    return this.request<LightningInvoice>('/api/invoice', {
      method: 'POST',
      body: JSON.stringify({
        event_id: eventId,
        size_bytes: sizeBytes,
        duration_years: durationYears,
      }),
    });
  }

  async createCommentInvoice(eventId: string, sizeBytes: number): Promise<LightningInvoice> {
    return this.request<LightningInvoice>('/api/comment-invoice', {
      method: 'POST',
      body: JSON.stringify({
        event_id: eventId,
        size_bytes: sizeBytes,
      }),
    });
  }

  async checkPayment(paymentHash: string): Promise<{
    paid: boolean;
    settled_at?: string;
    amount_sats: number;
    expires_at: string;
  }> {
    return this.request(`/api/payment/${paymentHash}`);
  }

  // Research papers
  async getPublishedPapers(limit: number = 50): Promise<ResearchPaper[]> {
    return this.request<ResearchPaper[]>(`/api/papers?limit=${limit}`);
  }

  async getPaperContent(eventId: string): Promise<{
    event_id: string;
    title: string;
    authors: string[];
    abstract: string;
    content: string;
    published_at: string;
  }> {
    return this.request(`/api/papers/${eventId}/content`);
  }
}

// Multi-relay API client for comparing pricing across relays
export class MultiRelayApi {
  private clients: Map<string, ApiClient> = new Map();

  addRelay(url: string): void {
    const httpUrl = url.replace('ws://', 'http://').replace('wss://', 'https://');
    this.clients.set(url, new ApiClient(httpUrl));
  }

  async getRelayInfos(): Promise<Map<string, RelayInfo>> {
    const results = new Map<string, RelayInfo>();
    
    const promises = Array.from(this.clients.entries()).map(async ([url, client]) => {
      try {
        const info = await client.getRelayInfo();
        results.set(url, info);
      } catch (error) {
        console.error(`Failed to get info for relay ${url}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async calculatePricingForAllRelays(sizeBytes: number, durationYears: number = 1): Promise<Map<string, PricingInfo>> {
    const results = new Map<string, PricingInfo>();
    
    const promises = Array.from(this.clients.entries()).map(async ([url, client]) => {
      try {
        const pricing = await client.calculatePricing(sizeBytes, durationYears);
        results.set(url, pricing);
      } catch (error) {
        console.error(`Failed to get pricing for relay ${url}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async createInvoicesForSelectedRelays(
    eventId: string, 
    sizeBytes: number, 
    selectedRelayUrls: string[], 
    durationYears: number = 1
  ): Promise<Map<string, LightningInvoice>> {
    const results = new Map<string, LightningInvoice>();
    
    const promises = selectedRelayUrls.map(async (url) => {
      const client = this.clients.get(url);
      if (!client) return;

      try {
        const invoice = await client.createInvoice(eventId, sizeBytes, durationYears);
        results.set(url, invoice);
      } catch (error) {
        console.error(`Failed to create invoice for relay ${url}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async checkPaymentsForAllRelays(paymentHashes: Map<string, string>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    const promises = Array.from(paymentHashes.entries()).map(async ([url, paymentHash]) => {
      const client = this.clients.get(url);
      if (!client) return;

      try {
        const paymentStatus = await client.checkPayment(paymentHash);
        results.set(url, paymentStatus.paid);
      } catch (error) {
        console.error(`Failed to check payment for relay ${url}:`, error);
        results.set(url, false);
      }
    });

    await Promise.all(promises);
    return results;
  }

  getClient(url: string): ApiClient | undefined {
    return this.clients.get(url);
  }

  getRelayUrls(): string[] {
    return Array.from(this.clients.keys());
  }
}