import { useState, useContext, createContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { communitiesAPI, customFeedsAPI } from '../services/api';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [recentCommunities, setRecentCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [customFeeds, setCustomFeeds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all sidebar data fresh from server
  const fetchSidebarData = useCallback(async () => {
    if (!currentUser) {
      setRecentCommunities([]);
      setJoinedCommunities([]);
      setCustomFeeds([]);
      return;
    }

    try {
      setLoading(true);
      
      const [recent, joined, feeds] = await Promise.all([
        communitiesAPI.getRecent().catch(() => []),
        communitiesAPI.getJoined().catch(() => []),
        customFeedsAPI.getAll().catch(() => [])
      ]);
      
      setRecentCommunities(recent);
      setJoinedCommunities(joined);
      setCustomFeeds(feeds);
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // Optimistic update + background refresh for custom feeds
  const addCustomFeed = useCallback((newFeed) => {
    setCustomFeeds(prev => [newFeed, ...prev]);
  }, []);

  const updateCustomFeed = useCallback((updatedFeed) => {
    setCustomFeeds(prev => prev.map(f => f._id === updatedFeed._id ? updatedFeed : f));
  }, []);

  const removeCustomFeed = useCallback((feedId) => {
    setCustomFeeds(prev => prev.filter(f => f._id !== feedId));
  }, []);

  const toggleFeedFavorite = useCallback(async (feedId) => {
    // Optimistic update
    setCustomFeeds(prev => prev.map(f => 
      f._id === feedId ? { ...f, isFavorite: !f.isFavorite } : f
    ));
    
    try {
      await customFeedsAPI.toggleFavorite(feedId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setCustomFeeds(prev => prev.map(f => 
        f._id === feedId ? { ...f, isFavorite: !f.isFavorite } : f
      ));
    }
  }, []);

  // Optimistic update for joined communities
  const addJoinedCommunity = useCallback((community) => {
    setJoinedCommunities(prev => {
      // Avoid duplicates
      if (prev.some(c => c._id === community._id || c.name === community.name)) {
        return prev;
      }
      return [community, ...prev];
    });
  }, []);

  const removeJoinedCommunity = useCallback((communityId) => {
    setJoinedCommunities(prev => prev.filter(c => 
      c._id !== communityId && c.name !== communityId
    ));
  }, []);

  // Add to recent communities
  const addRecentCommunity = useCallback((community) => {
    setRecentCommunities(prev => {
      // Remove if already exists, then add to front
      const filtered = prev.filter(c => c.name !== community.name);
      return [community, ...filtered].slice(0, 5);
    });
  }, []);

  const value = {
    recentCommunities,
    joinedCommunities,
    customFeeds,
    loading,
    refreshSidebarData: fetchSidebarData,
    addCustomFeed,
    updateCustomFeed,
    removeCustomFeed,
    toggleFeedFavorite,
    addJoinedCommunity,
    removeJoinedCommunity,
    addRecentCommunity,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => {
  return useContext(SidebarContext);
};
