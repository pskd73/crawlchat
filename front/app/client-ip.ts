export function getClientIp(req: Request) {
  const headers = req.headers;
  return headers.get("x-forwarded-for") || headers.get("x-real-ip");
}

export type IpDetails = {
  ip: string;
  country: string;
  region: string;
  city: string;
  lat?: number;
  lng?: number;
  timezone?: string;
};

export async function fetchIpDetails(ip: string): Promise<IpDetails | null> {
  const response = await fetch(
    `https://geo.ipify.org/api/v2/country,city?apiKey=${process.env.IPIFY_API_KEY}&ipAddress=${ip}`
  );

  if (response.status !== 200) {
    console.warn(
      "Failed to fetch IP details",
      response.status,
      await response.text()
    );
    return null;
  }

  const data = await response.json();

  return {
    ip: data.ip,
    country: data.location.country,
    region: data.location.region,
    city: data.location.city,
    lat: data.location.lat,
    lng: data.location.lng,
    timezone: data.location.timezone,
  };
}
