export function track(name: string, meta: Record<string, any>) {
  (window as any)?.vmtrc?.("trackEvent", name, { eventData: meta });
}
