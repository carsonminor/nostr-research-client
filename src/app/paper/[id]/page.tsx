'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { formatDate, formatFileSize } from '@/lib/utils';
import CommentingSystem from '@/components/comments/CommentingSystem';

interface PaperContent {
  event_id: string;
  title: string;
  authors: string[];
  abstract: string;
  content: string;
  published_at: string;
  size_bytes?: number;
}

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { multiRelayApi } = useStore();
  const [paper, setPaper] = useState<PaperContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paperId = params.id as string;

  useEffect(() => {
    loadPaper();
  }, [paperId, multiRelayApi]);

  const loadPaper = async () => {
    if (!paperId || !multiRelayApi) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to get paper from any connected relay
      const relayUrls = multiRelayApi.getRelayUrls();
      if (relayUrls.length === 0) {
        setError('No relays connected');
        return;
      }

      // Try the first available relay
      const client = multiRelayApi.getClient(relayUrls[0]);
      if (!client) {
        setError('No relay client available');
        return;
      }

      const paperContent = await client.getPaperContent(paperId);
      setPaper(paperContent);
    } catch (error) {
      console.error('Failed to load paper:', error);
      setError('Failed to load paper content');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading paper...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Paper</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={loadPaper}>Retry</Button>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Paper Not Found</h2>
          <p className="text-gray-600 mb-4">The requested paper could not be found.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back to Browse
          </Button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {paper.title}
            </h1>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <span>Published {formatDate(paper.published_at)}</span>
              {paper.size_bytes && (
                <span>Size: {formatFileSize(paper.size_bytes)}</span>
              )}
              <span>ID: {paper.event_id.slice(0, 8)}...</span>
            </div>

            {/* Authors */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Authors</h3>
              <div className="flex flex-wrap gap-2">
                {paper.authors.map((author, index) => (
                  <span
                    key={index}
                    className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full font-mono"
                  >
                    {author.slice(0, 12)}...
                  </span>
                ))}
              </div>
            </div>

            {/* Abstract */}
            {paper.abstract && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Abstract</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">
                    {paper.abstract}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paper Content with Commenting */}
        <CommentingSystem paperId={paperId} paperContent={paper.content}>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="prose prose-gray max-w-none font-serif leading-relaxed">
              <ReactMarkdown 
                components={{
                  h1: ({children}) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900">{children}</h1>,
                  h2: ({children}) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">{children}</h2>,
                  h3: ({children}) => <h3 className="text-xl font-medium mt-4 mb-2 text-gray-900">{children}</h3>,
                  p: ({children}) => <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600">{children}</blockquote>,
                  code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                  pre: ({children}) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">{children}</pre>,
                }}
              >
                {paper.content}
              </ReactMarkdown>
            </div>
          </div>
        </CommentingSystem>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
          >
            ← Back to Browse
          </Button>
        </div>
      </div>
    </div>
  );
}