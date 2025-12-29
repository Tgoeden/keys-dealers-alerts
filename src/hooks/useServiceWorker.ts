import { useServiceWorkerContext } from '@/contexts/ServiceWorkerContext';

/**
 * Hook to access service worker state and actions.
 */
export const useServiceWorker = () => {
  return useServiceWorkerContext();
};
