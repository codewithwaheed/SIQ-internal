import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseTabSyncReturn {
  isActiveTab: boolean;
  conflictWarning: boolean;
  takeover: () => void;
}

export const useTabSync = (conversationId: string | null): UseTabSyncReturn => {
  const [isActiveTab, setIsActiveTab] = useState(true);
  const [conflictWarning, setConflictWarning] = useState(false);
  const { toast } = useToast();

  const generateTabId = useCallback(() => {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const takeover = useCallback(() => {
    if (conversationId) {
      const tabId = generateTabId();
      localStorage.setItem(`activeTab_${conversationId}`, tabId);
      sessionStorage.setItem('currentTabId', tabId);
      setIsActiveTab(true);
      setConflictWarning(false);

      toast({
        title: 'Active Session',
        description: 'This tab is now the active chat session.',
      });
    }
  }, [conversationId, generateTabId, toast]);

  useEffect(() => {
    if (!conversationId) return;

    const tabId = sessionStorage.getItem('currentTabId') || generateTabId();
    sessionStorage.setItem('currentTabId', tabId);

    const checkActiveTab = () => {
      const activeTabId = localStorage.getItem(`activeTab_${conversationId}`);
      const currentTabId = sessionStorage.getItem('currentTabId');

      if (!activeTabId) {
        // No active tab, this becomes the active one
        localStorage.setItem(`activeTab_${conversationId}`, currentTabId!);
        setIsActiveTab(true);
        setConflictWarning(false);
      } else if (activeTabId === currentTabId) {
        // This is the active tab
        setIsActiveTab(true);
        setConflictWarning(false);
      } else {
        // Another tab is active
        setIsActiveTab(false);
        setConflictWarning(true);
      }
    };

    // Initial check
    checkActiveTab();

    // Set up storage listener for tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `activeTab_${conversationId}`) {
        checkActiveTab();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Periodic check (in case storage events are missed)
    const interval = setInterval(checkActiveTab, 2000);

    // Update active tab timestamp periodically
    const heartbeatInterval = setInterval(() => {
      const currentTabId = sessionStorage.getItem('currentTabId');
      const activeTabId = localStorage.getItem(`activeTab_${conversationId}`);

      if (activeTabId === currentTabId) {
        localStorage.setItem(`activeTabHeartbeat_${conversationId}`, Date.now().toString());
      }
    }, 5000);

    // Cleanup old active tabs (if no heartbeat for 30 seconds)
    const cleanupInterval = setInterval(() => {
      const lastHeartbeat = localStorage.getItem(`activeTabHeartbeat_${conversationId}`);
      if (lastHeartbeat) {
        const heartbeatTime = parseInt(lastHeartbeat);
        const now = Date.now();

        if (now - heartbeatTime > 30000) {
          // Active tab is stale, allow takeover
          localStorage.removeItem(`activeTab_${conversationId}`);
          localStorage.removeItem(`activeTabHeartbeat_${conversationId}`);
          checkActiveTab();
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
    };
  }, [conversationId, generateTabId]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentTabId = sessionStorage.getItem('currentTabId');
      const activeTabId = localStorage.getItem(`activeTab_${conversationId}`);

      if (conversationId && activeTabId === currentTabId) {
        localStorage.removeItem(`activeTab_${conversationId}`);
        localStorage.removeItem(`activeTabHeartbeat_${conversationId}`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [conversationId]);

  return {
    isActiveTab,
    conflictWarning,
    takeover,
  };
};
