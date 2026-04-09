import type { Location } from "@packages/common/prisma";
import { getCountryData, type TCountryCode } from "countries-list";
import { useMemo } from "react";

export function CountryFlag({ location }: { location: Location }) {
  const country = useMemo(
    () => location.country && getCountryData(location.country as TCountryCode),
    [location.country]
  );
  if (!country || !location.country) {
    return null;
  }

  return (
    <div
      className="tooltip tooltip-right"
      data-tip={[location.city, country.name].filter(Boolean).join(", ")}
    >
      <img
        src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${location.country.toUpperCase()}.svg`}
        alt={country.name}
        className="min-w-8 rounded-box border border-base-300"
      />
    </div>
  );
}
