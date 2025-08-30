'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Header from '@/components/layout/Header';
import PapersList from '@/components/browse/PapersList';
import PublishForm from '@/components/publish/PublishForm';
import Profile from '@/components/profile/Profile';
import SignIn from '@/components/auth/SignIn';

export default function Home() {
  const { activeTab, isSignedIn, initializeNostr, signIn } = useStore();

  useEffect(() => {
    initializeNostr();
  }, [initializeNostr]);

  // Show sign in screen if user is not signed in
  if (!isSignedIn) {
    return <SignIn onSignIn={signIn} />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'publish':
        return <PublishForm />;
      case 'profile':
        return <Profile />;
      case 'browse':
      default:
        return <PapersList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              Nostr Research Journal - A decentralized research platform powered by{' '}
              <a href="https://nostr.com" className="text-blue-600 hover:text-blue-800">
                Nostr
              </a>{' '}
              and{' '}
              <a href="https://lightning.network" className="text-blue-600 hover:text-blue-800">
                Lightning Network
              </a>
            </p>
            <p className="mt-2">
              Built with Next.js, TypeScript, and Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
