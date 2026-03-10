export function getClientIp(req: Request) {
  const headers = req.headers;

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .find(Boolean);
    if (firstIp) {
      return firstIp;
    }
  }

  const fallbackIp =
    headers.get("x-real-ip") || headers.get("x-client-ip") || null;

  return fallbackIp;
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

async function fetchIpifyDetails(ip: string): Promise<IpDetails | null> {
  if (!process.env.IPIFY_API_KEY) {
    console.warn("IPIFY API key is not set");
    return null;
  }

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

export async function fetchGeoIpDetails(ip: string): Promise<IpDetails | null> {
  if (
    !process.env.GEOIP_HOST ||
    !process.env.GEOIP_USERNAME ||
    !process.env.GEOIP_PASSWORD
  ) {
    console.warn("GeoIP host, username, or password is not set");
    return null;
  }

  const authHeader = `Basic ${Buffer.from(
    `${process.env.GEOIP_USERNAME ?? ""}:${process.env.GEOIP_PASSWORD ?? ""}`
  ).toString("base64")}`;

  const response = await fetch(`${process.env.GEOIP_HOST}/${ip}`, {
    headers: {
      Authorization: authHeader,
    },
  });

  if (response.status !== 200) {
    console.warn(
      "Failed to fetch IP details with GeoIP",
      response.status,
      await response.text()
    );
    return null;
  }

  const data = await response.json();

  return {
    ip,
    country: data.country,
    region: data.stateprov,
    city: data.city,
    lat: data.latitude,
    lng: data.longitude,
    timezone: data.timezone,
  };
}

export async function fetchIpDetails(ip: string): Promise<IpDetails | null> {
  return fetchGeoIpDetails(ip);
}
