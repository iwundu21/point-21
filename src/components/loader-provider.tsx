
'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import FullScreenLoader from './full-screen-loader';

interface LoaderContextType {
  showLoader: (path: string) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};

export const LoaderProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const showLoader = useCallback((path: string) => {
    setIsLoading(true);
    setTimeout(() => {
      router.push(path);
      // A short delay to allow the new page to start rendering before hiding the loader
      setTimeout(() => {
          setIsLoading(false);
      }, 500); 
    }, 2000); // Keep loader on for 2 seconds
  }, [router]);

  return (
    <LoaderContext.Provider value={{ showLoader }}>
      {isLoading && <FullScreenLoader />}
      {children}
    </LoaderContext.Provider>
  );
};
