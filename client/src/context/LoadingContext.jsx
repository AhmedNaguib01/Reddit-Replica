import { createContext, useContext, useState, useCallback, useRef } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const loadingCountRef = useRef(0);

  const startLoading = useCallback(() => {
    loadingCountRef.current += 1;
    if (loadingCountRef.current === 1) {
      setIsLoading(true);
    }
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setIsLoading(false);
    }
  }, []);

  // Value object - startLoading and stopLoading are stable due to useCallback with empty deps
  const value = { isLoading, startLoading, stopLoading };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};
