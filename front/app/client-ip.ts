export function getClientIp(req: Request) {
  const headers = req.headers;
  
  const ipHeaders = {
    "x-forwarded-for": headers.get("x-forwarded-for"),
    "cf-connecting-ip": headers.get("cf-connecting-ip"),
    "x-real-ip": headers.get("x-real-ip"),
    "x-client-ip": headers.get("x-client-ip"),
  };
  
  console.log("IP-related headers:", ipHeaders);
  
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    const clientIp = ips[ips.length - 1];
    console.log("Extracted client IP from x-forwarded-for:", clientIp);
    return clientIp;
  }
  
  const fallbackIp = 
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-client-ip") ||
    null;
  
  console.log("Using fallback IP:", fallbackIp);
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
