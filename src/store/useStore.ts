import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NostrClient } from '@/lib/nostr';
import { MultiRelayApi } from '@/lib/api';
import { nip07 } from '@/lib/nip07';
import { NostrEvent, ResearchPaper, RelayConnection, PublishingRelayOption } from '@/types/nostr';

interface AppState {
  // Nostr client
  nostrClient: NostrClient | null;
  multiRelayApi: MultiRelayApi | null;
  
  // User state
  isSignedIn: boolean;
  publicKey: string | null;
  usingExtension: boolean;
  
  // Relays
  relays: RelayConnection[];
  selectedRelayUrls: string[];
  
  // Publishing state
  isPublishing: boolean;
  publishingRelays: PublishingRelayOption[];
  currentPaper: {
    title: string;
    content: string;
    abstract: string;
    identifier: string;
    sizeBytes: number;
  } | null;
  
  // Papers
  papers: ResearchPaper[];
  isLoadingPapers: boolean;
  
  // UI state
  activeTab: 'browse' | 'publish' | 'profile';
  
  // Actions
  initializeNostr: () => void;
  signIn: (privateKey?: string) => void;
  signOut: () => void;
  addRelay: (url: string) => Promise<void>;
  removeRelay: (url: string) => void;
  setSelectedRelays: (urls: string[]) => void;
  setActiveTab: (tab: 'browse' | 'publish' | 'profile') => void;
  
  // Publishing actions
  setPaperData: (data: Partial<AppState['currentPaper']>) => void;
  startPublishing: () => void;
  finishPublishing: () => void;
  updatePublishingRelay: (url: string, updates: Partial<PublishingRelayOption>) => void;
  
  // Papers actions
  loadPapers: () => Promise<void>;
  addPaper: (paper: ResearchPaper) => void;
}

const DEFAULT_RELAYS = [
  'ws://localhost:8080', // Local test relay
  'wss://relay.example.com', // Example relay
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      nostrClient: null,
      multiRelayApi: null,
      isSignedIn: false,
      publicKey: null,
      usingExtension: false,
      relays: [],
      selectedRelayUrls: [],
      isPublishing: false,
      publishingRelays: [],
      currentPaper: null,
      papers: [],
      isLoadingPapers: false,
      activeTab: 'browse',

      // Initialize Nostr client (without auto-generating keys)
      initializeNostr: () => {
        const client = new NostrClient();
        const api = new MultiRelayApi();
        
        // Check if user already has keys stored
        const hasExistingKeys = !!client.getPublicKey();
        
        set({ 
          nostrClient: client, 
          multiRelayApi: api,
          publicKey: client.getPublicKey(),
          isSignedIn: hasExistingKeys
        });

        // Only add relays if user is signed in
        if (hasExistingKeys) {
          DEFAULT_RELAYS.forEach(url => {
            api.addRelay(url);
            client.addRelay(url).then(connection => {
              set(state => ({
                relays: [...state.relays.filter(r => r.url !== url), connection]
              }));
            });
          });
        }
      },

      // Sign in with existing or new key
      signIn: (privateKey?: string) => {
        const { nostrClient, multiRelayApi } = get();
        if (!nostrClient || !multiRelayApi) return;

        let isUsingExtension = false;
        let publicKey = null;

        if (privateKey?.startsWith('nip07:')) {
          // NIP-07 browser extension authentication
          isUsingExtension = true;
          publicKey = privateKey.replace('nip07:', '');
          nostrClient.setExtensionMode(publicKey);
        } else if (privateKey) {
          // Traditional private key authentication
          nostrClient.setPrivateKey(privateKey);
          publicKey = nostrClient.getPublicKey();
        } else {
          // Generate new key
          nostrClient.generateNewKey();
          publicKey = nostrClient.getPublicKey();
        }

        set({
          isSignedIn: true,
          publicKey,
          usingExtension: isUsingExtension
        });

        // Connect to default relays after signing in
        DEFAULT_RELAYS.forEach(url => {
          multiRelayApi.addRelay(url);
          if (!isUsingExtension) {
            // Only connect with NostrClient if not using extension
            nostrClient.addRelay(url).then(connection => {
              set(state => ({
                relays: [...state.relays.filter(r => r.url !== url), connection]
              }));
            }).catch(error => {
              console.error(`Failed to connect to relay ${url}:`, error);
            });
          } else {
            // For extension users, just mark as connected
            set(state => ({
              relays: [...state.relays.filter(r => r.url !== url), {
                url,
                status: 'connected',
                info: { name: url, description: 'Connected via browser extension' }
              }]
            }));
          }
        });
      },

      // Sign out
      signOut: () => {
        const { nostrClient } = get();
        if (nostrClient) {
          nostrClient.disconnect();
        }
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nostr-private-key');
        }

        set({
          isSignedIn: false,
          publicKey: null,
          usingExtension: false,
          nostrClient: null,
          multiRelayApi: null,
          relays: [],
          papers: []
        });
      },

      // Add relay
      addRelay: async (url: string) => {
        const { nostrClient, multiRelayApi } = get();
        if (!nostrClient || !multiRelayApi) return;

        try {
          const connection = await nostrClient.addRelay(url);
          multiRelayApi.addRelay(url);
          
          set(state => ({
            relays: [...state.relays.filter(r => r.url !== url), connection]
          }));
        } catch (error) {
          console.error('Failed to add relay:', error);
        }
      },

      // Remove relay
      removeRelay: (url: string) => {
        set(state => ({
          relays: state.relays.filter(r => r.url !== url),
          selectedRelayUrls: state.selectedRelayUrls.filter(u => u !== url)
        }));
      },

      // Set selected relays for publishing
      setSelectedRelays: (urls: string[]) => {
        set({ selectedRelayUrls: urls });
      },

      // Set active tab
      setActiveTab: (tab: 'browse' | 'publish' | 'profile') => {
        set({ activeTab: tab });
      },

      // Set paper data for publishing
      setPaperData: (data) => {
        set(state => ({
          currentPaper: state.currentPaper ? { ...state.currentPaper, ...data } : {
            title: '',
            content: '',
            abstract: '',
            identifier: '',
            sizeBytes: 0,
            ...data
          }
        }));
      },

      // Start publishing process
      startPublishing: () => {
        const { selectedRelayUrls, relays } = get();
        
        const publishingRelays: PublishingRelayOption[] = selectedRelayUrls.map(url => {
          const relay = relays.find(r => r.url === url);
          return {
            url,
            name: relay?.info?.name || url,
            pricing: { amount_sats: 0, size_mb: 0, duration_years: 1, description: '' },
            selected: true,
            paid: false
          };
        });

        set({
          isPublishing: true,
          publishingRelays
        });
      },

      // Finish publishing process
      finishPublishing: () => {
        set({
          isPublishing: false,
          publishingRelays: [],
          currentPaper: null
        });
      },

      // Update publishing relay
      updatePublishingRelay: (url: string, updates: Partial<PublishingRelayOption>) => {
        set(state => ({
          publishingRelays: state.publishingRelays.map(relay =>
            relay.url === url ? { ...relay, ...updates } : relay
          )
        }));
      },

      // Load papers from relays
      loadPapers: async () => {
        const { multiRelayApi } = get();
        if (!multiRelayApi) return;

        set({ isLoadingPapers: true });

        try {
          // For now, just load from the first relay
          const relayUrls = multiRelayApi.getRelayUrls();
          if (relayUrls.length > 0) {
            const client = multiRelayApi.getClient(relayUrls[0]);
            if (client) {
              const papers = await client.getPublishedPapers();
              set({ papers });
            }
          }
        } catch (error) {
          console.error('Failed to load papers:', error);
        } finally {
          set({ isLoadingPapers: false });
        }
      },

      // Add paper to local state
      addPaper: (paper: ResearchPaper) => {
        set(state => ({
          papers: [paper, ...state.papers.filter(p => p.id !== paper.id)]
        }));
      },
    }),
    {
      name: 'nostr-research-client',
      partialize: (state) => ({
        selectedRelayUrls: state.selectedRelayUrls,
        activeTab: state.activeTab,
      }),
    }
  )
);