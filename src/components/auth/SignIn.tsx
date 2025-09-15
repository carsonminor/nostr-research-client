'use client';

import { useState, useEffect } from 'react';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/Button';
import { detectExtensionType, isExtensionAvailable, nip07 } from '@/lib/nip07';

interface SignInProps {
  onSignIn: (privateKey?: string) => void;
  isLoading?: boolean;
}

export default function SignIn({ onSignIn, isLoading = false }: SignInProps) {
  const [mode, setMode] = useState<'select' | 'import' | 'create'>('select');
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [extensionType, setExtensionType] = useState<string | null>(null);
  const [isExtensionLoading, setIsExtensionLoading] = useState(false);

  useEffect(() => {
    // Check for browser extension after component mounts
    const checkExtension = () => {
      const type = detectExtensionType();
      setExtensionType(type);
    };

    // Check immediately and after a short delay (extensions might load asynchronously)
    checkExtension();
    const timer = setTimeout(checkExtension, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleExtensionSignIn = async () => {
    setIsExtensionLoading(true);
    setError('');

    try {
      const success = await nip07.initialize();
      if (success) {
        const pubkey = nip07.getPublicKey();
        if (pubkey) {
          // For NIP-07, we don't get the private key - the extension handles signing
          onSignIn('nip07:' + pubkey); // Special flag to indicate NIP-07 usage
        } else {
          setError('Failed to get public key from extension');
        }
      } else {
        setError('Failed to connect to browser extension');
      }
    } catch (error) {
      setError(`Extension error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtensionLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'import') {
      if (!privateKey.trim()) {
        setError('Please enter your private key');
        return;
      }

      // Validate private key format (should be 64 hex characters)
      const hexRegex = /^[a-fA-F0-9]{64}$/;
      if (!hexRegex.test(privateKey.trim())) {
        setError('Invalid private key format. Expected 64 hexadecimal characters.');
        return;
      }

      onSignIn(privateKey.trim());
    } else if (mode === 'create') {
      onSignIn(); // Create new account
    }
  };

  const handleImportFromNsec = () => {
    // Handle nsec (bech32) format import
    try {
      const { data } = nip19.decode(privateKey.trim());
      const hexKey = Buffer.from(data as Uint8Array).toString('hex');
      setPrivateKey(hexKey);
      setError(''); // Clear any previous errors
    } catch (error) {
      setError('Invalid nsec key format');
    }
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Nostr Research Journal
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Decentralized academic research platform
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-4">
              {/* Browser Extension Sign In */}
              {extensionType ? (
                <div className="mb-6">
                  <Button
                    onClick={handleExtensionSignIn}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={isLoading || isExtensionLoading}
                  >
                    {isExtensionLoading ? (
                      'Connecting...'
                    ) : (
                      <>
                        🔌 Sign In with {extensionType}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Detected: {extensionType} browser extension
                  </p>
                  
                  <div className="my-4 relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Install <a href="https://getalby.com" className="underline">Alby</a> or <a href="https://github.com/fiatjaf/nos2x" className="underline">nos2x</a> for easier sign-in!
                  </p>
                </div>
              )}

              <Button
                onClick={() => setMode('create')}
                className="w-full"
                disabled={isLoading}
              >
                Create New Account
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setMode('import')}
                className="w-full"
                disabled={isLoading}
              >
                Sign In with Private Key
              </Button>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="text-sm text-gray-500">
                <p className="mb-2"><strong>New to Nostr?</strong></p>
                <p>Create a new account to get started. Your keys will be generated locally and stored securely in your browser.</p>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500">
                <p className="mb-2"><strong>Already have a Nostr account?</strong></p>
                <p>Import your existing private key (hex or nsec format) to access your account.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Create New Account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              A new Nostr key pair will be generated for you
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Important Information:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Your private key will be generated locally and stored in your browser</li>
                      <li>Make sure to backup your private key after account creation</li>
                      <li>You can export your key from the Profile tab</li>
                      <li>Without your private key, you cannot recover your account</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Sign In with Existing Key
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Import your Nostr private key
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="private-key" className="block text-sm font-medium text-gray-700">
                Private Key
              </label>
              <div className="mt-1">
                <input
                  id="private-key"
                  type={showKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Enter hex private key or nsec..."
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="show-key"
                    type="checkbox"
                    checked={showKey}
                    onChange={(e) => setShowKey(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="show-key" className="ml-2 block text-sm text-gray-700">
                    Show key
                  </label>
                </div>
                {privateKey.startsWith('nsec') && (
                  <button
                    type="button"
                    onClick={handleImportFromNsec}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Convert nsec to hex
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Supported formats:</p>
                <ul className="mt-1 list-disc list-inside">
                  <li><strong>Hex:</strong> 64 character hexadecimal string</li>
                  <li><strong>nsec:</strong> Bech32 encoded private key (starts with &apos;nsec&apos;)</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode('select')}
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !privateKey.trim()}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}