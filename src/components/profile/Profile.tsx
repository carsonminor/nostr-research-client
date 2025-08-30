'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';

export default function Profile() {
  const { 
    publicKey, 
    nostrClient, 
    relays, 
    addRelay, 
    removeRelay,
    signOut
  } = useStore();

  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [isAddingRelay, setIsAddingRelay] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const npub = nostrClient?.getPublicKeyNpub();
  const privateKey = nostrClient?.getPrivateKey();
  const nsec = nostrClient?.getPrivateKeyNsec();

  const handleAddRelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelayUrl.trim()) return;

    setIsAddingRelay(true);
    try {
      await addRelay(newRelayUrl.trim());
      setNewRelayUrl('');
    } catch (error) {
      console.error('Failed to add relay:', error);
    } finally {
      setIsAddingRelay(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Public Key (npub)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={npub || ''}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => npub && copyToClipboard(npub)}
              >
                Copy
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Public Key (hex)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={publicKey || ''}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => publicKey && copyToClipboard(publicKey)}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Relay Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Relay Management</h3>
        
        {/* Add new relay */}
        <form onSubmit={handleAddRelay} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add New Relay
          </label>
          <div className="flex space-x-2">
            <input
              type="url"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              placeholder="wss://relay.example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isAddingRelay}
            />
            <Button type="submit" disabled={isAddingRelay || !newRelayUrl.trim()}>
              {isAddingRelay ? 'Adding...' : 'Add Relay'}
            </Button>
          </div>
        </form>

        {/* Relay list */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Connected Relays</h4>
          {relays.length === 0 ? (
            <p className="text-gray-500 text-sm">No relays connected.</p>
          ) : (
            relays.map((relay) => (
              <div key={relay.url} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      relay.status === 'connected' ? 'bg-green-500' :
                      relay.status === 'connecting' ? 'bg-yellow-500' :
                      relay.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {relay.info?.name || relay.url}
                      </p>
                      <p className="text-sm text-gray-500">{relay.url}</p>
                      {relay.info?.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {relay.info.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    relay.status === 'connected' ? 'bg-green-100 text-green-800' :
                    relay.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    relay.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {relay.status}
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeRelay(relay.url)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Relay info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">About Relays</h5>
          <p className="text-sm text-blue-700">
            Relays are servers that store and distribute your Nostr events. For research papers, 
            you should connect to multiple relays to ensure redundancy and availability. Each relay 
            may charge different fees for storage based on content size and duration.
          </p>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Account Actions</h3>
        
        <div className="space-y-6">
          {/* Private Key Export */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Private Key Export</h4>
                <p className="text-sm text-gray-500">
                  Export your private key for backup or use in other Nostr clients.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? 'Hide' : 'Show'} Private Key
              </Button>
            </div>

            {showPrivateKey && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Warning: Never share your private key with anyone!
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Anyone with access to your private key can control your account.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private Key (hex)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={privateKey || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => privateKey && copyToClipboard(privateKey)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private Key (nsec)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={nsec || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => nsec && copyToClipboard(nsec)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="mb-2"><strong>Key Formats:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Hex:</strong> Raw 64-character hexadecimal format</li>
                    <li><strong>nsec:</strong> Bech32 encoded format (starts with 'nsec'), more user-friendly</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          {/* Account Deletion */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Delete Account</h4>
                <p className="text-sm text-gray-500">
                  This will remove your private key from this device. Make sure you have a backup.
                </p>
              </div>
              <Button variant="destructive" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Your private key is stored locally in your browser. 
            Make sure to backup your key if you want to access your account from other devices.
          </p>
        </div>
      </div>
    </div>
  );
}