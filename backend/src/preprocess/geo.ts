export interface Coordinate {
  lng: number;
  lat: number;
}

export const KOREA_BBOX = {
  minLng: 124,
  maxLng: 132,
  minLat: 33,
  maxLat: 39,
};

const EARTH_RADIUS_M = 6371008.8;

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

export const isInsideKoreaBBox = ({ lng, lat }: Coordinate): boolean =>
  lng >= KOREA_BBOX.minLng &&
  lng <= KOREA_BBOX.maxLng &&
  lat >= KOREA_BBOX.minLat &&
  lat <= KOREA_BBOX.maxLat;

export const haversineDistanceM = (a: Coordinate, b: Coordinate): number => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const toLineStringWkt = (points: Coordinate[]): string =>
  `SRID=4326;LINESTRING(${points.map((point) => `${point.lng} ${point.lat}`).join(', ')})`;

export const toPointWkt = (point: Coordinate): string =>
  `SRID=4326;POINT(${point.lng} ${point.lat})`;

export const toGeoJsonLineString = (points: Coordinate[]) => ({
  type: 'LineString' as const,
  coordinates: points.map((point) => [point.lng, point.lat]),
});

