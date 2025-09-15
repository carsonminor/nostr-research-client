'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useTextSelection, TextSelection } from '@/hooks/useTextSelection';
import { Button } from '@/components/ui/Button';
import { NostrEvent } from '@/types/nostr';

interface Highlight {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  comments: Comment[];
  author: string;
  created_at: number;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  created_at: number;
  likes: number;
  highlightId: string;
  replies?: Comment[];
}

interface CommentingSystemProps {
  paperId: string;
  paperContent: string;
  children: React.ReactNode;
}

export default function CommentingSystem({ paperId, paperContent, children }: CommentingSystemProps) {
  const { nostrClient, publicKey } = useStore();
  const { selection, clearSelection } = useTextSelection();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [savedSelection, setSavedSelection] = useState<TextSelection | null>(null);
  
  // Debug showCommentBox changes
  useEffect(() => {
    console.log('showCommentBox changed to:', showCommentBox);
  }, [showCommentBox]);

  // Handle escape key to close comment box
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showCommentBox) {
        setShowCommentBox(false);
        setSavedSelection(null);
        clearSelection();
        setCommentText('');
      }
    };

    if (showCommentBox) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showCommentBox, clearSelection]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load existing highlights from relay
  useEffect(() => {
    loadHighlights();
  }, [paperId]);

  // Debug highlights state
  useEffect(() => {
    console.log('Highlights state updated:', highlights);
  }, [highlights]);

  const loadHighlights = async () => {
    console.log('Loading highlights for paper:', paperId);
    try {
      const response = await fetch(`http://localhost:8080/api/papers/${paperId}/highlights`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const highlightData = await response.json();
        console.log('Raw highlight data:', highlightData);
        
        const transformedHighlights: Highlight[] = highlightData.map((h: {
          id: string;
          content: string;
          pubkey: string;
          created_at: number;
          tags: string[][];
          comments: { id: string; content: string; pubkey: string; created_at: number; reactions?: { content: string }[]; }[];
        }) => {
          const rangeTag = h.tags.find((tag: string[]) => tag[0] === 'range');
          const position = rangeTag ? {
            start: parseInt(rangeTag[1].split(':')[0]),
            end: parseInt(rangeTag[1].split(':')[1])
          } : { start: 0, end: 0 };

          return {
            id: h.id,
            text: h.content,
            startOffset: position.start,
            endOffset: position.end,
            comments: h.comments.map((c: {
              id: string;
              content: string;
              pubkey: string;
              created_at: number;
              reactions?: { content: string }[];
            }) => ({
              id: c.id,
              content: c.content,
              author: c.pubkey,
              created_at: c.created_at * 1000,
              likes: c.reactions?.filter((r: { content: string }) => r.content === '+').length || 0,
              highlightId: h.id
            })),
            author: h.pubkey,
            created_at: h.created_at * 1000
          };
        });

        setHighlights(transformedHighlights);
      }
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  };

  const handleSubmitComment = async () => {
    const activeSelection = savedSelection || selection;
    if (!activeSelection || !commentText.trim() || !nostrClient || !publicKey) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create highlight event (NIP-84)
      const highlightEvent = await nostrClient.createHighlight(
        activeSelection.text,
        paperId,
        '',
        { start: activeSelection.startOffset, end: activeSelection.endOffset }
      );

      if (!highlightEvent) {
        throw new Error('Failed to create highlight');
      }

      // Create comment on highlight (NIP-1)
      const commentEvent = await nostrClient.createHighlightComment(
        commentText,
        highlightEvent.id
      );

      if (!commentEvent) {
        throw new Error('Failed to create comment');
      }

      // Publish both events
      const connectedRelays = nostrClient.getConnectedRelays().map(r => r.url);
      
      await Promise.all([
        nostrClient.publishEvent(highlightEvent, connectedRelays),
        nostrClient.publishEvent(commentEvent, connectedRelays)
      ]);

      // Add to local state
      const newHighlight: Highlight = {
        id: highlightEvent.id,
        text: activeSelection.text,
        startOffset: activeSelection.startOffset,
        endOffset: activeSelection.endOffset,
        comments: [{
          id: commentEvent.id,
          content: commentText,
          author: publicKey,
          created_at: Date.now(),
          likes: 0,
          highlightId: highlightEvent.id
        }],
        author: publicKey,
        created_at: Date.now()
      };

      setHighlights(prev => [...prev, newHighlight]);
      setCommentText('');
      setShowCommentBox(false);
      setSavedSelection(null);
      clearSelection();
      
      // Reload highlights from server to ensure consistency
      setTimeout(() => loadHighlights(), 1000);
    } catch (error) {
      console.error('Failed to create highlight/comment:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMarginIndicators = () => {
    if (highlights.length === 0) {
      console.log('No highlights to render');
      return null;
    }

    console.log(`Rendering ${highlights.length} blue dots for highlights`);
    
    return highlights.map((highlight, index) => (
      <div
        key={highlight.id}
        className="fixed w-4 h-4 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 z-50 border-2 border-white shadow-lg"
        style={{ 
          top: `${200 + (index * 30)}px`, // Simple fixed positioning for testing
          right: '50px'
        }}
        onClick={() => {
          console.log('Clicked highlight dot:', highlight.id);
          setSelectedHighlight(selectedHighlight === highlight.id ? null : highlight.id);
        }}
        title={`Comment: ${highlight.text}`}
      />
    ));
  };

  return (
    <div className="relative">
      {/* Content wrapper */}
      <div className="relative pr-12">
        <div ref={contentRef}>
          {children}
        </div>
        
        {/* Margin indicators - positioned relative to content */}
        {renderMarginIndicators()}
      </div>

      {/* Comment button when text is selected */}
      {selection && !showCommentBox && publicKey && (
        <div
          className="fixed z-50 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
          style={{
            left: `${selection.boundingRect.right + 10}px`,
            top: `${selection.boundingRect.top + window.scrollY}px`
          }}
          onClick={(e) => {
            console.log('💬 Comment button clicked!');
            console.log('Saving selection before opening comment box');
            try {
              e.preventDefault();
              e.stopPropagation();
              // Save the current selection before it gets cleared
              setSavedSelection(selection);
              setShowCommentBox(true);
              console.log('Saved selection:', selection);
            } catch (error) {
              console.error('Error in click handler:', error);
            }
          }}
          onMouseDown={(e) => {
            console.log('Comment button mouse down');
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseEnter={() => console.log('Comment button hovered')}
        >
          💬 Add Comment
        </div>
      )}

      {/* Comment input box */}
      {(() => {
        console.log('Comment box render check:');
        console.log('- selection exists:', !!selection);
        console.log('- savedSelection exists:', !!savedSelection);
        console.log('- showCommentBox:', showCommentBox);
        console.log('- publicKey exists:', !!publicKey);
        
        const activeSelection = savedSelection || selection;
        console.log('- Should render:', activeSelection && showCommentBox && publicKey);
        
        // Calculate optimal position to keep comment box in viewport
        const calculatePosition = (selection: TextSelection) => {
          const commentBoxWidth = 320; // w-80 = 320px
          const commentBoxHeight = 200; // Approximate height
          const margin = 10;
          
          let left = selection.boundingRect.right + margin;
          let top = selection.boundingRect.top + window.scrollY;
          
          // Adjust horizontal position if comment box would go off-screen
          if (left + commentBoxWidth > window.innerWidth) {
            left = selection.boundingRect.left - commentBoxWidth - margin;
          }
          
          // Ensure minimum left position
          if (left < margin) {
            left = margin;
          }
          
          // Adjust vertical position if comment box would go off bottom of screen
          if (top + commentBoxHeight > window.innerHeight + window.scrollY) {
            top = Math.max(
              selection.boundingRect.bottom + window.scrollY - commentBoxHeight,
              window.scrollY + margin
            );
          }
          
          return { left, top };
        };
        
        return activeSelection && showCommentBox && publicKey && (() => {
          const position = calculatePosition(activeSelection);
          
          return (
            <div
              className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80"
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`
              }}
            >
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Add Comment</h4>
              <span className="text-xs text-gray-500">Press ESC to close</span>
            </div>
            <div className="bg-yellow-50 p-2 rounded text-sm text-gray-700 border-l-4 border-yellow-400">
              &quot;{activeSelection.text}&quot;
            </div>
          </div>
          
          <textarea
            id="comment-text"
            name="commentText"
            value={commentText}
            onChange={(e) => {
              console.log('Comment text changed:', e.target.value);
              setCommentText(e.target.value);
            }}
            placeholder="Write your comment..."
            className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
            rows={3}
            autoFocus
          />
          
          <div className="flex justify-between mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowCommentBox(false);
                clearSelection();
                setSavedSelection(null);
                setCommentText('');
              }}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={(e) => {
                console.log('Post Comment button clicked');
                console.log('Comment text:', commentText);
                console.log('Selection:', selection);
                console.log('Public key:', publicKey);
                e.preventDefault();
                handleSubmitComment();
              }}
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
          );
        })();
      })()}

      {/* Click comment display */}
      {selectedHighlight && (() => {
        const highlight = highlights.find(h => h.id === selectedHighlight);
        if (!highlight) return null;
        
        return (
          <div 
            className="fixed z-40 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-60 overflow-y-auto"
            style={{
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900">Comment</h4>
              <button
                onClick={() => setSelectedHighlight(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-3 pb-2 border-b border-gray-200">
              <div className="bg-yellow-50 p-2 rounded text-sm text-gray-700 border-l-4 border-yellow-400">
                &quot;{highlight.text}&quot;
              </div>
            </div>
            
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {highlight.comments.map(comment => (
                <div key={comment.id} className="text-sm">
                  <p className="text-gray-800 mb-1">{comment.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{comment.author.slice(0, 8)}...</span>
                    <div className="flex items-center space-x-2">
                      <span>👍 {comment.likes}</span>
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Debug info - temporary */}
      {selection && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs rounded">
          Selected: &quot;{selection.text.slice(0, 50)}...&quot; 
          <br />
          Range: {selection.startOffset}-{selection.endOffset}
          <br />
          Signed in: {publicKey ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
}