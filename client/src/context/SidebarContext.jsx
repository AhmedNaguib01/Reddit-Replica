import { useState, useContext, createContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { communitiesAPI, customFeedsAPI } from '../services/api';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [recentCommunities, setRecentCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [customFeeds, setCustomFeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchSidebarData = useCallback(async (force = false) => {
    if (!currentUser) {
      setRecentCommunities([]);
      setJoinedCommunities([]);
      setCustomFeeds([]);
      hasFetched.current = false;
      return;
    }

    // Skip if already fetched and not forced
    if (hasFetched.current && !force) {
      return;
    }

    try {
      setLoading(true);
      
      // Always use cached version - it will fetch if cache is empty/expired
      const [recent, joined, feeds] = await Promise.all([
        communitiesAPI.getRecent().catch(() => []),
        communitiesAPI.getJoinedCached().catch(() => []),
        customFeedsAPI.getAll().catch(() => [])
      ]);
      setRecentCommunities(recent);
      setJoinedCommunities(joined);
      setCustomFeeds(feeds);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Wait for auth to finish before fetching sidebar data
    if (authLoading) return;
    fetchSidebarData();
  }, [fetchSidebarData, authLoading]);

  const addCustomFeed = (newFeed) => {
    setCustomFeeds(prev => [newFeed, ...prev]);
  };

  const updateCustomFeed = (updatedFeed) => {
    setCustomFeeds(prev => prev.map(f => 
      f._id === updatedFeed._id ? updatedFeed : f
    ));
  };

  const removeCustomFeed = (feedId) => {
    setCustomFeeds(prev => prev.filter(f => f._id !== feedId));
  };

  const toggleFeedFavorite = async (feedId) => {
    try {
      await customFeedsAPI.toggleFavorite(feedId);
      setCustomFeeds(prev => prev.map(f => 
        f._id === feedId ? { ...f, isFavorite: !f.isFavorite } : f
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const addJoinedCommunity = (community) => {
    setJoinedCommunities(prev => [community, ...prev]);
  };

  const value = {
    recentCommunities,
    joinedCommunities,
    customFeeds,
    loading,
    refreshSidebarData: () => fetchSidebarData(true),
    addCustomFeed,
    updateCustomFeed,
    removeCustomFeed,
    toggleFeedFavorite,
    addJoinedCommunity,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => {
  return useContext(SidebarContext);
};
