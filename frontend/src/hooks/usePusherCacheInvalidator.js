import { useEffect } from 'react';
import { clearMemoryCache } from '@/hooks/useDataCache';

/**
 * Custom hook for Pusher / Laravel Echo Real-Time WebSocket Cache Invalidation.
 * Automatically clears RAM cache keys when real-time broadcast events arrive.
 * 
 * @param {string} channelName - Pusher channel name (e.g. 'bookings', 'notifications')
 * @param {string} eventName - Event name (e.g. '.BookingCreated', '.StatusUpdated')
 * @param {string|string[]} cacheKeysToInvalidate - Cache key(s) to clear upon event
 * @param {function} [onEventCallback] - Optional callback
 */
export function usePusherCacheInvalidator(channelName, eventName, cacheKeysToInvalidate, onEventCallback) {
  useEffect(() => {
    if (!channelName || !eventName) return;

    // Echo instance fallback if window.Echo is configured
    if (window.Echo) {
      const channel = window.Echo.channel(channelName);
      
      channel.listen(eventName, (data) => {
        console.log(`📡 Real-Time Pusher Event Received: ${eventName}`, data);
        
        if (Array.isArray(cacheKeysToInvalidate)) {
          cacheKeysToInvalidate.forEach(k => clearMemoryCache(k));
        } else if (cacheKeysToInvalidate) {
          clearMemoryCache(cacheKeysToInvalidate);
        }

        if (onEventCallback) onEventCallback(data);
      });

      return () => {
        window.Echo.leaveChannel(channelName);
      };
    }
  }, [channelName, eventName, cacheKeysToInvalidate, onEventCallback]);
}
