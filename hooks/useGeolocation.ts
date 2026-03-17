'use client';

import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'mobile' | 'desktop' | 'unknown';
export type GeoStatus = 'idle' | 'searching' | 'found' | 'desktop' | 'denied';

export interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  deviceType: DeviceType;
  status: GeoStatus;
}

function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown';
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ? 'mobile' : 'desktop';
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    lat: null, lng: null, accuracy: null,
    deviceType: 'unknown', status: 'idle',
  });

  useEffect(() => {
    const device = detectDevice();
    setState(prev => ({ ...prev, deviceType: device, status: 'searching' }));

    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, status: 'denied' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          deviceType: device,
          status: device === 'mobile' ? 'found' : 'desktop',
        });
      },
      () => {
        setState(prev => ({ ...prev, status: 'denied' }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return state;
}
