import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react';

interface ServiceWorkerContextType {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  currentVersion: string;
  applyUpdate: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const LOCAL_VERSION = '1.3.1';

const defaultContextValue: ServiceWorkerContextType = {
  isUpdateAvailable: false,
  isOffline: false,
  currentVersion: LOCAL_VERSION,
  applyUpdate: async () => { window.location.reload(); },
  forceRefresh: async () => { window.location.reload(); }
};

const ServiceWorkerContext = createContext<ServiceWorkerContextType>(defaultContextValue);

export const useServiceWorkerContext = () => {
  return useContext(ServiceWorkerContext);
};

export const ServiceWorkerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  const applyUpdate = useCallback(async () => {
    try {
      if (registrationRef.current?.waiting) {
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  // Initialize service worker in background - completely non-blocking
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    mountedRef.current = true;

    // Only register service worker after 10 seconds to ensure app is fully loaded
    const timeout = setTimeout(async () => {
      if (!mountedRef.current) return;
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        if (mountedRef.current) {
          registrationRef.current = registration;
          
          if (registration.waiting) {
            setUpdateAvailable(true);
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller && mountedRef.current) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      } catch {
        // Ignore errors
      }
    }, 10000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
    };
  }, []);

  const contextValue: ServiceWorkerContextType = {
    isUpdateAvailable: updateAvailable,
    isOffline: false,
    currentVersion: LOCAL_VERSION,
    applyUpdate,
    forceRefresh
  };

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}
    </ServiceWorkerContext.Provider>
  );
};
