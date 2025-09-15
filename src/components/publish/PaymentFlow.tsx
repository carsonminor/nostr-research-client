'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { PublishingRelayOption } from '@/types/nostr';

interface PaymentFlowProps {
  onBack: () => void;
  onFinish: () => void;
}

export default function PaymentFlow({ onBack, onFinish }: PaymentFlowProps) {
  const { 
    publishingRelays, 
    updatePublishingRelay, 
    finishPublishing,
    currentPaper,
    multiRelayApi,
    nostrClient 
  } = useStore();

  const [isCreatingInvoices, setIsCreatingInvoices] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    createInvoices();
  }, []);

  const createInvoices = async () => {
    if (!currentPaper || !multiRelayApi) return;

    setIsCreatingInvoices(true);
    try {
      const selectedUrls = publishingRelays
        .filter(relay => relay.selected)
        .map(relay => relay.url);

      const invoices = await multiRelayApi.createInvoicesForSelectedRelays(
        currentPaper.identifier,
        currentPaper.sizeBytes,
        selectedUrls
      );

      // Update each relay with its invoice
      invoices.forEach((invoice, url) => {
        updatePublishingRelay(url, { invoice });
      });

    } catch (error) {
      console.error('Failed to create invoices:', error);
    } finally {
      setIsCreatingInvoices(false);
    }
  };

  const simulatePayment = async (url: string) => {
    const relay = publishingRelays.find(r => r.url === url);
    if (!relay?.invoice) return;

    updatePublishingRelay(url, { paid: true });
    
    // Simulate payment delay
    setTimeout(() => {
      // In a real implementation, you would check the actual payment status
      console.log(`Payment simulated for ${url}`);
    }, 1000);
  };

  const publishPaper = async () => {
    if (!currentPaper || !nostrClient) return;

    setIsPublishing(true);
    try {
      // Create the Nostr event
      const event = await nostrClient.createResearchPaper(
        currentPaper.title,
        currentPaper.content,
        currentPaper.abstract,
        currentPaper.identifier
      );

      if (!event) {
        throw new Error('Failed to create Nostr event');
      }

      // Get paid relays
      const paidRelayUrls = publishingRelays
        .filter(relay => relay.paid)
        .map(relay => relay.url);

      // Publish to paid relays
      const results = await nostrClient.publishEvent(event, paidRelayUrls);
      setPublishResults(results);

      // If any publishes succeeded, finish the flow
      const hasSuccess = Array.from(results.values()).some(success => success);
      if (hasSuccess) {
        setTimeout(() => {
          finishPublishing();
          onFinish();
        }, 2000);
      }

    } catch (error) {
      console.error('Failed to publish paper:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const allPaid = publishingRelays.every(relay => !relay.selected || relay.paid);
  const totalCost = publishingRelays
    .filter(relay => relay.selected)
    .reduce((total, relay) => total + relay.pricing.amount_sats, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Pay & Publish Your Research Paper
      </h2>

      {currentPaper && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Publishing Summary</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Title:</strong> {currentPaper.title}</p>
            <p><strong>Selected Relays:</strong> {publishingRelays.filter(r => r.selected).length}</p>
            <p><strong>Total Cost:</strong> {totalCost} sats</p>
          </div>
        </div>
      )}

      {isCreatingInvoices ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Creating Lightning invoices...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {publishingRelays
            .filter(relay => relay.selected)
            .map((relay) => (
              <PaymentCard
                key={relay.url}
                relay={relay}
                onPayment={() => simulatePayment(relay.url)}
                publishResult={publishResults.get(relay.url)}
              />
            ))}
        </div>
      )}

      {/* Publishing section */}
      {allPaid && !isPublishing && publishResults.size === 0 && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Ready to Publish!</h4>
          <p className="text-sm text-green-700 mb-4">
            All payments have been completed. You can now publish your research paper to the selected relays.
          </p>
          <Button onClick={publishPaper} className="bg-green-600 hover:bg-green-700">
            Publish Research Paper
          </Button>
        </div>
      )}

      {/* Publishing status */}
      {isPublishing && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-blue-700">Publishing to relays...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {publishResults.size > 0 && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Publishing Results</h4>
          <div className="space-y-2">
            {Array.from(publishResults.entries()).map(([url, success]) => (
              <div key={url} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{url}</span>
                <span className={`font-medium ${success ? 'text-green-600' : 'text-red-600'}`}>
                  {success ? 'Success' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
          
          {Array.from(publishResults.values()).some(s => s) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                🎉 Your research paper has been successfully published! It will now be available on the relay network.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack} disabled={isPublishing}>
          Back
        </Button>
        
        {publishResults.size > 0 && Array.from(publishResults.values()).some(s => s) && (
          <Button onClick={onFinish}>
            Finish
          </Button>
        )}
      </div>
    </div>
  );
}

interface PaymentCardProps {
  relay: PublishingRelayOption;
  onPayment: () => void;
  publishResult?: boolean;
}

function PaymentCard({ relay, onPayment, publishResult }: PaymentCardProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paying' | 'paid'>('pending');

  const handlePayment = async () => {
    setPaymentStatus('paying');
    
    // Simulate payment process
    setTimeout(() => {
      setPaymentStatus('paid');
      onPayment();
    }, 2000);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900">{relay.name}</h4>
          <p className="text-sm text-gray-500">{relay.url}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">{relay.pricing.amount_sats} sats</p>
          <p className="text-sm text-gray-500">{relay.pricing.description}</p>
        </div>
      </div>

      {relay.invoice && (
        <div className="bg-gray-50 rounded p-3 mb-4">
          <p className="text-xs text-gray-600 mb-2">Lightning Invoice:</p>
          <p className="text-xs font-mono text-gray-800 break-all">
            {relay.invoice.payment_request}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {relay.paid ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Paid
            </span>
          ) : paymentStatus === 'paying' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Paying...
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Pending Payment
            </span>
          )}

          {publishResult !== undefined && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              publishResult ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {publishResult ? '✓ Published' : '✗ Publish Failed'}
            </span>
          )}
        </div>

        {!relay.paid && paymentStatus === 'pending' && (
          <Button size="sm" onClick={handlePayment}>
            Pay Invoice (Mock)
          </Button>
        )}
      </div>
    </div>
  );
}