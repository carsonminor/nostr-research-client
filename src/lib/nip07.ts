// NIP-07 Browser Extension Support (Alby, nos2x, etc.)
// Ref: https://github.com/nostr-protocol/nips/blob/master/07.md

import { NostrEvent, UnsignedNostrEvent } from '@/types/nostr';

export interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<NostrEvent>;
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    nostr?: NostrExtension;
  }
}

export class NIP07Provider {
  private extension: NostrExtension | null = null;
  private publicKey: string | null = null;

  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    // Check if extension is available
    if (!window.nostr) {
      return false;
    }

    this.extension = window.nostr;
    
    try {
      // Get public key from extension
      this.publicKey = await this.extension.getPublicKey();
      return true;
    } catch (error) {
      console.error('Failed to initialize NIP-07 extension:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.nostr;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  async signEvent(event: UnsignedNostrEvent): Promise<NostrEvent> {
    if (!this.extension) {
      throw new Error('No NIP-07 extension available');
    }

    return await this.extension.signEvent(event);
  }

  async getRelays(): Promise<Record<string, { read: boolean; write: boolean }> | null> {
    if (!this.extension?.getRelays) {
      return null;
    }

    try {
      return await this.extension.getRelays();
    } catch (error) {
      console.error('Failed to get relays from extension:', error);
      return null;
    }
  }

  // Encrypt/decrypt using extension (NIP-04)
  async encrypt(pubkey: string, plaintext: string): Promise<string | null> {
    if (!this.extension?.nip04) {
      return null;
    }

    try {
      return await this.extension.nip04.encrypt(pubkey, plaintext);
    } catch (error) {
      console.error('Failed to encrypt with extension:', error);
      return null;
    }
  }

  async decrypt(pubkey: string, ciphertext: string): Promise<string | null> {
    if (!this.extension?.nip04) {
      return null;
    }

    try {
      return await this.extension.nip04.decrypt(pubkey, ciphertext);
    } catch (error) {
      console.error('Failed to decrypt with extension:', error);
      return null;
    }
  }
}

// Utility functions
export function detectExtensionType(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check for specific extension markers
  if ((window as { alby?: unknown }).alby) return 'Alby';
  if ((window as { nos2x?: unknown }).nos2x) return 'nos2x';
  if (window.nostr) return 'Unknown NIP-07 Extension';
  
  return null;
}

export function isExtensionAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

// Create a global instance
export const nip07 = new NIP07Provider();