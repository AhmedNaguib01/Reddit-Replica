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
  const [hasFetched, setHasFetched] = useState(false);

  const fetchSidebarData = useCallback(async (force = false) => {
    if (!currentUser) {
      setRecentCommunities([]);
      setJoinedCommunities([]);
      setCustomFeeds([]);
      setHasFetched(false);
      return;
    }

    // Skip if already fetched and not forcing refresh
    if (hasFetched && !force) return;

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
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, hasFetched]);

  useEffect(() => {
    fetchSidebarData();
  }, [currentUser]);

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
