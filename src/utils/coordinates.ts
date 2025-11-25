const mapboxgl = require('@mapbox/mapbox-sdk');
const geocodingService = require('@mapbox/mapbox-sdk/services/geocoding');

export interface MapboxResponse {
  place_id: string;
  lat: number;
  lon: number;
  display_name: string;
}

// Initialize Mapbox client once
const mapboxClient = mapboxgl({
  accessToken: process.env.MAPBOX_ACCESS_TOKEN || ''
});

const geocoder = geocodingService(mapboxClient);

export async function getCoordinates(address: string, city: string, state: string): Promise<string | null> {
  try {
    const fullAddress = `${address}, ${city}, ${state}`;
    
    const response = await geocoder
      .forwardGeocode({
        query: fullAddress,
        limit: 1,
        types: ['address']
      })
      .send();

    if (
      response.body.features &&
      response.body.features.length > 0
    ) {
      const [longitude, latitude] = response.body.features[0].center;
      return `${latitude},${longitude}`;
    }

    console.warn(`No coordinates found for address: ${fullAddress}`);
    return null;

  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function validateCoordinates(coordinates: string): boolean {
  try {
    const [lat, lon] = coordinates.split(',').map(Number);
    return (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  } catch {
    return false;
  }
}
