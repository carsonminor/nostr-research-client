import { 
  generateSecretKey,
  getPublicKey, 
  finalizeEvent,
  Relay,
  nip19,
  type Filter,
  type Event
} from 'nostr-tools';
import { NostrEvent, NostrFilter, RelayConnection, RelayInfo } from '@/types/nostr';
import { nip07 } from './nip07';

export class NostrClient {
  private privateKey: string | null = null;
  private publicKey: string | null = null;
  private relays: Map<string, RelayConnection> = new Map();
  private usingExtension: boolean = false;

  constructor() {
    // Load keys from localStorage if available
    if (typeof window !== 'undefined') {
      const savedPrivateKey = localStorage.getItem('nostr-private-key');
      if (savedPrivateKey) {
        this.setPrivateKey(savedPrivateKey);
      }
    }
  }

  // Key management
  generateNewKey(): string {
    const privateKeyBytes = generateSecretKey();
    const privateKey = Buffer.from(privateKeyBytes).toString('hex');
    this.setPrivateKey(privateKey);
    return privateKey;
  }

  setPrivateKey(privateKey: string): void {
    this.privateKey = privateKey;
    const privateKeyBytes = new Uint8Array(Buffer.from(privateKey, 'hex'));
    this.publicKey = getPublicKey(privateKeyBytes);
    this.usingExtension = false;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('nostr-private-key', privateKey);
    }
  }

  setExtensionMode(publicKey: string): void {
    this.privateKey = null; // Don't store private key for extension users
    this.publicKey = publicKey;
    this.usingExtension = true;
    
    // Clear any stored private key
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nostr-private-key');
    }
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  getPrivateKey(): string | null {
    return this.privateKey;
  }

  getPublicKeyNpub(): string | null {
    if (!this.publicKey) return null;
    return nip19.npubEncode(this.publicKey);
  }

  getPrivateKeyNsec(): string | null {
    if (!this.privateKey) return null;
    const privateKeyBytes = new Uint8Array(Buffer.from(this.privateKey, 'hex'));
    return nip19.nsecEncode(privateKeyBytes);
  }

  // Event creation
  async createEvent(kind: number, content: string, tags: string[][] = []): Promise<Event | null> {
    if (!this.publicKey) {
      throw new Error('No public key available');
    }

    const unsignedEvent = {
      kind,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.publicKey,
    };

    if (this.usingExtension) {
      // Use browser extension to sign
      try {
        return await nip07.signEvent(unsignedEvent);
      } catch (error) {
        throw new Error(`Extension signing failed: ${error}`);
      }
    } else {
      // Use local private key
      if (!this.privateKey) {
        throw new Error('No private key set');
      }
      
      const privateKeyBytes = new Uint8Array(Buffer.from(this.privateKey, 'hex'));
      return finalizeEvent(unsignedEvent, privateKeyBytes);
    }
  }

  isUsingExtension(): boolean {
    return this.usingExtension;
  }

  async createResearchPaper(title: string, content: string, summary: string, identifier: string): Promise<Event | null> {
    const tags = [
      ['title', title],
      ['summary', summary],
      ['d', identifier],
      ['published_at', Math.floor(Date.now() / 1000).toString()]
    ];

    return await this.createEvent(30023, content, tags);
  }

  async createComment(content: string, rootEventId: string, parentEventId?: string): Promise<Event | null> {
    const tags = [
      ['E', rootEventId], // Root event
      ['K', '30023'], // Root event kind
    ];

    if (parentEventId) {
      tags.push(['e', parentEventId]); // Parent event for threading
    }

    return await this.createEvent(1111, content, tags);
  }

  // NIP-84: Create highlight event
  async createHighlight(
    highlightedText: string, 
    sourceEventId: string, 
    context?: string,
    position?: { start: number; end: number }
  ): Promise<Event | null> {
    const tags = [
      ['e', sourceEventId], // Reference to source event
      ['context', context || ''], // Surrounding text context
    ];

    // Add position data as custom tags if provided
    if (position) {
      tags.push(['range', `${position.start}:${position.end}`]);
    }

    return await this.createEvent(9802, highlightedText, tags);
  }

  // Create comment on highlight (kind 1 reply)
  async createHighlightComment(content: string, highlightEventId: string): Promise<Event | null> {
    const tags = [
      ['e', highlightEventId], // Reply to highlight
      ['k', '9802'], // Highlight kind
    ];

    return await this.createEvent(1, content, tags);
  }

  // NIP-25: Create reaction (like/dislike)
  async createReaction(targetEventId: string, content: string = '+'): Promise<Event | null> {
    const tags = [
      ['e', targetEventId],
      ['k', '1'], // Reacting to comment
    ];

    return await this.createEvent(7, content, tags);
  }

  // Relay management
  async addRelay(url: string): Promise<RelayConnection> {
    const relay = new Relay(url);
    
    const connection: RelayConnection = {
      url,
      status: 'connecting',
      websocket: undefined,
      subscriptions: new Map(),
    };

    this.relays.set(url, connection);

    try {
      await relay.connect();
      connection.status = 'connected';
      connection.websocket = relay as unknown as WebSocket;
      
      // Fetch relay info
      try {
        const info = await this.fetchRelayInfo(url);
        connection.info = info;
      } catch (e) {
        console.warn(`Could not fetch info for relay ${url}:`, e);
      }
    } catch (error) {
      connection.status = 'error';
      console.error(`Failed to connect to relay ${url}:`, error);
    }

    return connection;
  }

  async fetchRelayInfo(url: string): Promise<RelayInfo> {
    const httpUrl = url.replace('ws://', 'http://').replace('wss://', 'https://');
    
    const response = await fetch(httpUrl, {
      headers: {
        'Accept': 'application/nostr+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch relay info: ${response.statusText}`);
    }

    return response.json();
  }

  getRelays(): RelayConnection[] {
    return Array.from(this.relays.values());
  }

  getConnectedRelays(): RelayConnection[] {
    return this.getRelays().filter(relay => relay.status === 'connected');
  }

  // Event publishing
  async publishEvent(event: Event, relayUrls?: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const targetRelays = relayUrls || Array.from(this.relays.keys());

    const publishPromises = targetRelays.map(async (url) => {
      const connection = this.relays.get(url);
      if (!connection || connection.status !== 'connected') {
        results.set(url, false);
        return;
      }

      try {
        const relay = new Relay(url);
        await relay.connect();
        await relay.publish(event);
        results.set(url, true);
        relay.close();
      } catch (error) {
        console.error(`Failed to publish to ${url}:`, error);
        results.set(url, false);
      }
    });

    await Promise.all(publishPromises);
    return results;
  }

  // Event querying
  async queryEvents(filters: Filter[], relayUrls?: string[]): Promise<Event[]> {
    const events: Event[] = [];
    const targetRelays = relayUrls || Array.from(this.relays.keys());

    const queryPromises = targetRelays.map(async (url) => {
      try {
        const relay = new Relay(url);
        await relay.connect();
        
        const sub = relay.subscribe(filters, {
          onevent: (event: Event) => {
            events.push(event);
          },
          oneose: () => {
            relay.close();
          }
        });
        
        return new Promise<Event[]>((resolve) => {
          setTimeout(() => {
            relay.close();
            resolve([]);
          }, 5000);
        });
      } catch (error) {
        console.error(`Failed to query events from ${url}:`, error);
        return [];
      }
    });

    const results = await Promise.all(queryPromises);
    results.forEach(relayEvents => events.push(...relayEvents));

    // Deduplicate events by ID
    const uniqueEvents = events.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    return uniqueEvents.sort((a, b) => b.created_at - a.created_at);
  }

  // Subscription management
  subscribe(filters: Filter[], onEvent: (event: Event) => void, relayUrls?: string[]): string {
    const subscriptionId = Math.random().toString(36).substring(7);
    const targetRelays = relayUrls || Array.from(this.relays.keys());

    targetRelays.forEach(async (url) => {
      const connection = this.relays.get(url);
      if (!connection || connection.status !== 'connected') return;

      try {
        const relay = new Relay(url);
        await relay.connect();
        
        const sub = relay.subscribe(filters, {
          onevent: onEvent
        });
        connection.subscriptions.set(subscriptionId, filters);
      } catch (error) {
        console.error(`Failed to subscribe to ${url}:`, error);
      }
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string, relayUrls?: string[]): void {
    const targetRelays = relayUrls || Array.from(this.relays.keys());
    
    targetRelays.forEach(url => {
      const connection = this.relays.get(url);
      if (connection) {
        connection.subscriptions.delete(subscriptionId);
      }
    });
  }

  // Cleanup
  disconnect(): void {
    this.relays.forEach(connection => {
      if (connection.websocket) {
        connection.websocket.close?.();
      }
    });
    this.relays.clear();
  }
}