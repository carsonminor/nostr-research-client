'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface RelaySelectionProps {
  onNext: () => void;
  onBack: () => void;
}

export default function RelaySelection({ onNext, onBack }: RelaySelectionProps) {
  const { 
    relays, 
    selectedRelayUrls, 
    setSelectedRelays, 
    currentPaper,
    multiRelayApi 
  } = useStore();

  const [relayPricing, setRelayPricing] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentPaper && multiRelayApi) {
      loadPricing();
    }
  }, [currentPaper, multiRelayApi]);

  const loadPricing = async () => {
    if (!currentPaper || !multiRelayApi) return;
    
    setIsLoading(true);
    try {
      const pricing = await multiRelayApi.calculatePricingForAllRelays(currentPaper.sizeBytes);
      setRelayPricing(pricing);
    } catch (error) {
      console.error('Failed to load pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRelay = (url: string) => {
    const newSelection = selectedRelayUrls.includes(url)
      ? selectedRelayUrls.filter(u => u !== url)
      : [...selectedRelayUrls, url];
    
    setSelectedRelays(newSelection);
  };

  const connectedRelays = relays.filter(relay => relay.status === 'connected');
  const totalCost = selectedRelayUrls.reduce((total, url) => {
    const pricing = relayPricing.get(url);
    return total + (pricing?.amount_sats || 0);
  }, 0);

  const canProceed = selectedRelayUrls.length >= 2; // Minimum 2 relays as per requirements

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Select Publishing Relays
      </h2>

      {currentPaper && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Paper Details</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Title:</strong> {currentPaper.title}</p>
            <p><strong>Size:</strong> {formatFileSize(currentPaper.sizeBytes)}</p>
            <p><strong>Storage Duration:</strong> 1 year</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading pricing...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {connectedRelays.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No relays connected. Please add and connect to relays first.</p>
            </div>
          ) : (
            connectedRelays.map((relay) => {
              const pricing = relayPricing.get(relay.url);
              const isSelected = selectedRelayUrls.includes(relay.url);
              
              return (
                <div
                  key={relay.url}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleRelay(relay.url)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRelay(relay.url)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {relay.info?.name || relay.url}
                        </h4>
                        <p className="text-sm text-gray-500">{relay.url}</p>
                        {relay.info?.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {relay.info.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {pricing ? (
                        <div>
                          <p className="font-semibold text-gray-900">
                            {pricing.amount_sats} sats
                          </p>
                          <p className="text-sm text-gray-500">
                            {pricing.description}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Pricing unavailable</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Requirements notice */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> You must select at least 2 relays for redundancy and resilience.
          This ensures your research paper remains accessible even if one relay goes offline.
        </p>
      </div>

      {/* Summary */}
      {selectedRelayUrls.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Publishing Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Selected relays: {selectedRelayUrls.length}</p>
            <p>Total cost: {totalCost} sats</p>
            <p>Average cost per relay: {Math.round(totalCost / selectedRelayUrls.length)} sats</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        
        <Button 
          onClick={onNext} 
          disabled={!canProceed}
          className={!canProceed ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Next: Pay & Publish ({selectedRelayUrls.length} relays)
        </Button>
      </div>
    </div>
  );
}