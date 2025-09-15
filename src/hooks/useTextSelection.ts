import { useState, useEffect, useCallback } from 'react';

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  boundingRect: DOMRect;
  range: Range;
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    
    if (!text) {
      setSelection(null);
      return;
    }

    // Calculate text offsets within the document
    const startOffset = getTextOffset(range.startContainer, range.startOffset);
    const endOffset = getTextOffset(range.endContainer, range.endOffset);
    
    const boundingRect = range.getBoundingClientRect();

    setSelection({
      text,
      startOffset,
      endOffset,
      boundingRect,
      range: range.cloneRange()
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return {
    selection,
    clearSelection
  };
}

function getTextOffset(container: Node, offset: number): number {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let textOffset = 0;
  let currentNode;

  while (currentNode = walker.nextNode()) {
    if (currentNode === container) {
      return textOffset + offset;
    }
    textOffset += (currentNode as Text).textContent?.length || 0;
  }

  return textOffset;
}