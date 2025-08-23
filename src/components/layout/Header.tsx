'use client';

import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';

export default function Header() {
  const { 
    isSignedIn, 
    publicKey, 
    activeTab, 
    setActiveTab, 
    signIn, 
    signOut,
    nostrClient 
  } = useStore();

  const handleSignIn = () => {
    signIn();
  };

  const npub = nostrClient?.getPublicKeyNpub();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">
              Nostr Research Journal
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'browse'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Browse Papers
            </button>
            {isSignedIn && (
              <button
                onClick={() => setActiveTab('publish')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'publish'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Publish Paper
              </button>
            )}
            {isSignedIn && (
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile
              </button>
            )}
          </nav>

          {/* User section */}
          <div className="flex items-center space-x-4">
            {isSignedIn ? (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-700">
                  <div className="font-medium">Signed in</div>
                  <div className="text-xs text-gray-500 font-mono">
                    {npub ? `${npub.slice(0, 8)}...${npub.slice(-8)}` : 'Loading...'}
                  </div>
                </div>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button onClick={handleSignIn}>
                Sign In / Create Account
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <nav className="flex space-x-1 px-4 py-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
              activeTab === 'browse'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse
          </button>
          {isSignedIn && (
            <button
              onClick={() => setActiveTab('publish')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'publish'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Publish
            </button>
          )}
          {isSignedIn && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'profile'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}