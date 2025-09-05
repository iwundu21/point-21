
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
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
  const pathname = usePathname();

  const showLoader = useCallback((path: string) => {
    // Don't show loader if navigating to the same page
    if (path === pathname) return;

    setIsLoading(true);
    router.push(path);

    // Set a timeout to hide the loader after a fixed duration.
    // By this time, the new page should be fetched and ready to render.
    setTimeout(() => {
      setIsLoading(false);
    }, 1200); // Adjusted for a quicker yet smooth feel
  }, [router, pathname]);
  
   // This effect handles hiding the loader if the user uses browser back/forward buttons
   useEffect(() => {
    setIsLoading(false);
  }, [pathname]);


  return (
    <LoaderContext.Provider value={{ showLoader }}>
      {isLoading && <FullScreenLoader />}
      {children}
    </LoaderContext.Provider>
  );
};
