'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { calculateContentSize, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import RelaySelection from './RelaySelection';
import PaymentFlow from './PaymentFlow';

export default function PublishForm() {
  const { 
    isSignedIn, 
    isPublishing, 
    currentPaper,
    setPaperData, 
    startPublishing,
    nostrClient
  } = useStore();

  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    content: '',
  });

  const [currentStep, setCurrentStep] = useState<'form' | 'relays' | 'payment'>('form');

  if (!isSignedIn) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sign in to publish
        </h3>
        <p className="text-gray-500">
          You need to sign in with your Nostr account to publish research papers.
        </p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in at least the title and content');
      return;
    }

    const content = `# ${formData.title}\n\n## Abstract\n\n${formData.abstract}\n\n${formData.content}`;
    const sizeBytes = calculateContentSize(content);
    const identifier = generateId();

    setPaperData({
      title: formData.title,
      content,
      abstract: formData.abstract,
      identifier,
      sizeBytes
    });

    setCurrentStep('relays');
  };

  const handleRelaySelectionNext = () => {
    startPublishing();
    setCurrentStep('payment');
  };

  const handleBack = () => {
    if (currentStep === 'payment') {
      setCurrentStep('relays');
    } else if (currentStep === 'relays') {
      setCurrentStep('form');
    }
  };

  const handleFinish = () => {
    setCurrentStep('form');
    setFormData({ title: '', abstract: '', content: '' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center ${currentStep === 'form' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'form' ? 'border-blue-600 bg-blue-600 text-white' : 
            ['relays', 'payment'].includes(currentStep) ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Write Paper</span>
        </div>
        
        <div className="w-8 h-px bg-gray-300"></div>
        
        <div className={`flex items-center ${currentStep === 'relays' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'relays' ? 'border-blue-600 bg-blue-600 text-white' : 
            currentStep === 'payment' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Select Relays</span>
        </div>
        
        <div className="w-8 h-px bg-gray-300"></div>
        
        <div className={`flex items-center ${currentStep === 'payment' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'payment' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Pay & Publish</span>
        </div>
      </div>

      {/* Step content */}
      {currentStep === 'form' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Write Your Research Paper
          </h2>
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your research paper title"
                required
              />
            </div>

            {/* Abstract */}
            <div>
              <label htmlFor="abstract" className="block text-sm font-medium text-gray-700 mb-2">
                Abstract
              </label>
              <textarea
                id="abstract"
                value={formData.abstract}
                onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief summary of your research"
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content * (Markdown supported)
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Write your research paper content here using Markdown..."
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Size: {calculateContentSize(formData.title + formData.abstract + formData.content)} bytes
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                Next: Select Relays
              </Button>
            </div>
          </form>
        </div>
      )}

      {currentStep === 'relays' && (
        <RelaySelection 
          onNext={handleRelaySelectionNext}
          onBack={handleBack}
        />
      )}

      {currentStep === 'payment' && (
        <PaymentFlow 
          onBack={handleBack}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}