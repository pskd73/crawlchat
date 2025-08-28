import type { Location } from "libs/prisma";
import { useMemo } from "react";
import { getCountryData, type TCountryCode } from "countries-list";

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
      className="tooltip"
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
