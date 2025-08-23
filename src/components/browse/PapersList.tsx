'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { formatDate, formatFileSize, truncateText } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function PapersList() {
  const { papers, isLoadingPapers, loadPapers } = useStore();

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  if (isLoadingPapers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading papers...</span>
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No research papers found
          </h3>
          <p className="text-gray-500 mb-6">
            Be the first to publish a research paper on this relay network.
          </p>
          <Button onClick={loadPapers}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Published Research Papers
        </h2>
        <Button variant="outline" onClick={loadPapers}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}

interface PaperCardProps {
  paper: any; // Using ResearchPaper type
}

function PaperCard({ paper }: PaperCardProps) {
  const handleViewPaper = () => {
    // TODO: Open paper in modal or new page
    console.log('View paper:', paper.event_id);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {paper.title}
        </h3>

        {/* Abstract */}
        <p className="text-gray-600 text-sm line-clamp-3">
          {paper.abstract || 'No abstract available.'}
        </p>

        {/* Authors */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Authors
          </p>
          <div className="flex flex-wrap gap-1">
            {paper.authors.slice(0, 3).map((author: string, index: number) => (
              <span
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded font-mono"
              >
                {truncateText(author, 8)}
              </span>
            ))}
            {paper.authors.length > 3 && (
              <span className="text-xs text-gray-500">
                +{paper.authors.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(paper.published_at || paper.created_at)}</span>
          <span>{formatFileSize(paper.size_bytes)}</span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            paper.status === 'published' 
              ? 'bg-green-100 text-green-800'
              : paper.status === 'under_review'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {paper.status.replace('_', ' ')}
          </span>
          
          <Button size="sm" onClick={handleViewPaper}>
            Read Paper
          </Button>
        </div>
      </div>
    </div>
  );
}