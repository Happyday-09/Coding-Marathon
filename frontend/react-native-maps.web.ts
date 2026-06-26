// ============================================
// Web wrapper for Kakao Maps SDK (react-native-maps replacement)
// ============================================

import React, { createContext, useContext, useEffect, useRef, useState, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createPortal } from 'react-dom';
import axios from 'axios';

const KakaoMapContext = createContext<any>(null);

// Helper function to map latitudeDelta to Kakao Zoom Level (1: zoom in, 14: zoom out)
function getLevelFromDeltas(latitudeDelta: number): number {
  if (latitudeDelta < 0.003) return 1;
  if (latitudeDelta < 0.007) return 2;
  if (latitudeDelta < 0.015) return 3;
  if (latitudeDelta < 0.03) return 4;
  if (latitudeDelta < 0.06) return 5;
  if (latitudeDelta < 0.12) return 6;
  if (latitudeDelta < 0.24) return 7;
  if (latitudeDelta < 0.48) return 8;
  return 9;
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadKakaoScript(apiKey: string): Promise<void> {
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }
    if ((window as any).kakao && (window as any).kakao.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('kakao-maps-sdk');
    if (existingScript) {
      const handleLoad = () => {
        (window as any).kakao.maps.load(() => {
          resolve();
        });
      };
      existingScript.addEventListener('load', handleLoad);
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      const kakao = (window as any).kakao;
      if (kakao && kakao.maps) {
        kakao.maps.load(() => {
          resolve();
        });
      } else {
        reject(new Error('Kakao Maps object not found after script load'));
      }
    };
    
    script.onerror = (err) => {
      scriptLoadingPromise = null;
      const existing = document.getElementById('kakao-maps-sdk');
      if (existing) existing.remove();
      reject(err);
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

// MapView component wrapper
const MapView = React.forwardRef((props: any, ref: any) => {
  const { style, children, initialRegion, region, ...rest } = props;
  const containerRef = useRef<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string>(''); // Initialize empty to wait for backend/fallback
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch actual API key from backend config route
  useEffect(() => {
    let isMounted = true;
    axios.get('http://localhost:3000/api/config')
      .then(res => {
        if (isMounted) {
          if (res.data && res.data.success && res.data.data.kakaoMapApiKey) {
            setApiKey(res.data.data.kakaoMapApiKey);
          } else {
            setApiKey('d9e83ad98065ae5dae5dd68519c1f56d'); // Fallback to Javascript key
          }
        }
      })
      .catch(err => {
        console.warn('Failed to fetch Kakao Map key from backend, using fallback:', err);
        if (isMounted) {
          setApiKey('d9e83ad98065ae5dae5dd68519c1f56d'); // Fallback to Javascript key
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Kakao Map SDK script
  useEffect(() => {
    if (!apiKey) return;
    loadKakaoScript(apiKey)
      .then(() => {
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Error loading Kakao Map SDK:', err);
      });
  }, [apiKey]);

  // Initialize Kakao Map
  useEffect(() => {
    if (!isLoaded || !containerRef.current || mapInstance) return;

    try {
      const kakao = (window as any).kakao;
      const initialLat = initialRegion?.latitude || region?.latitude || 37.5283;
      const initialLng = initialRegion?.longitude || region?.longitude || 126.9480;
      const initialDelta = initialRegion?.latitudeDelta || region?.latitudeDelta || 0.025;
      
      const center = new kakao.maps.LatLng(initialLat, initialLng);
      const options = {
        center: center,
        level: getLevelFromDeltas(initialDelta),
      };
      
      const map = new kakao.maps.Map(containerRef.current, options);
      
      // Add zoom and type controls
      const zoomControl = new kakao.maps.ZoomControl();
      map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
      
      const mapTypeControl = new kakao.maps.MapTypeControl();
      map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

      setMapInstance(map);
    } catch (e) {
      console.error('Failed to initialize Kakao Map:', e);
    }
  }, [isLoaded, mapInstance, initialRegion, region]);

  // Handle manual region updates via props
  useEffect(() => {
    if (!mapInstance || !region) return;
    const kakao = (window as any).kakao;
    const latLng = new kakao.maps.LatLng(region.latitude, region.longitude);
    mapInstance.setCenter(latLng);
    if (region.latitudeDelta) {
      mapInstance.setLevel(getLevelFromDeltas(region.latitudeDelta));
    }
  }, [mapInstance, region]);

  // Expose methods like animateToRegion to parent via ref
  useImperativeHandle(ref, () => ({
    animateToRegion: (targetRegion: any, duration?: number) => {
      if (mapInstance) {
        const kakao = (window as any).kakao;
        const latLng = new kakao.maps.LatLng(targetRegion.latitude, targetRegion.longitude);
        mapInstance.panTo(latLng);
        if (targetRegion.latitudeDelta) {
          mapInstance.setLevel(getLevelFromDeltas(targetRegion.latitudeDelta));
        }
      }
    }
  }));

  return React.createElement(
    View,
    { ref: containerRef, style: [styles.mapContainer, style], ...rest },
    !isLoaded && React.createElement(
      View,
      { style: styles.loadingContainer },
      React.createElement(Text, { style: styles.loadingText }, '지도 로딩 중...')
    ),
    mapInstance && React.createElement(
      KakaoMapContext.Provider,
      { value: mapInstance },
      children
    )
  );
});

// Marker Component
const Marker = (props: any) => {
  const { coordinate, title, children } = props;
  const map = useContext(KakaoMapContext);
  const [container] = useState(() => {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.transform = 'translate(-50%, -50%)'; // Center aligning
      return div;
    }
    return null;
  });

  const markerRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !coordinate) return;
    const kakao = (window as any).kakao;
    const position = new kakao.maps.LatLng(coordinate.latitude, coordinate.longitude);

    if (children && container) {
      // Use CustomOverlay to render custom React element marker
      if (!overlayRef.current) {
        const overlay = new kakao.maps.CustomOverlay({
          position: position,
          content: container,
          xAnchor: 0.5,
          yAnchor: 0.5,
        });
        overlay.setMap(map);
        overlayRef.current = overlay;
      } else {
        overlayRef.current.setPosition(position);
      }
    } else {
      // Use standard Marker if there are no custom React children
      if (!markerRef.current) {
        const marker = new kakao.maps.Marker({
          position: position,
          title: title || '',
        });
        marker.setMap(map);
        markerRef.current = marker;
      } else {
        markerRef.current.setPosition(position);
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, coordinate.latitude, coordinate.longitude, children, container]);

  if (children && container) {
    return createPortal(children, container);
  }

  return null;
};

// Polyline Component
const Polyline = (props: any) => {
  const { coordinates, strokeColor, strokeWidth } = props;
  const map = useContext(KakaoMapContext);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !coordinates || coordinates.length === 0) return;
    const kakao = (window as any).kakao;
    
    const path = coordinates
      .filter((coord: any) => coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number' && coord.latitude !== 0 && coord.longitude !== 0)
      .map(
        (coord: any) => new kakao.maps.LatLng(coord.latitude, coord.longitude)
      );

    if (!polylineRef.current) {
      const polyline = new kakao.maps.Polyline({
        path: path,
        strokeWeight: strokeWidth || 4,
        strokeColor: strokeColor || '#5B5FEF',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      });
      polyline.setMap(map);
      polylineRef.current = polyline;
    } else {
      polylineRef.current.setPath(path);
      if (strokeColor) polylineRef.current.setOptions({ strokeColor });
      if (strokeWidth) polylineRef.current.setOptions({ strokeWeight: strokeWidth });
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, coordinates, strokeColor, strokeWidth]);

  return null;
};

// Other unused map components exported as null stubs
const Callout = (props: any) => null;
const Circle = (props: any) => null;
const Polygon = (props: any) => null;
const Heatmap = (props: any) => null;
const Overlay = (props: any) => null;

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#E8E9FD',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(232, 233, 253, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#5B5FEF',
    fontWeight: '600',
  },
});

export default MapView;
export { Marker, Polyline, Callout, Circle, Polygon, Heatmap, Overlay, PROVIDER_GOOGLE, PROVIDER_DEFAULT };
