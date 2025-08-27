import type { Location } from "libs/prisma";

export function CountryFlag({ location }: { location: Location }) {
  if (!location.country) {
    return null;
  }

  return (
    <div
      className="tooltip"
      data-tip={[location.city, location.region, location.country]
        .filter(Boolean)
        .join(", ")}
    >
      <img
        src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${location.country.toUpperCase()}.svg`}
        alt={location.country}
        className="min-w-8 rounded-box"
      />
    </div>
  );
}
