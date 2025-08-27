import { useEffect, useState } from "react";
import { TbCheck, TbChevronDown } from "react-icons/tb";

export function Select({
  label,
  name,
  options,
  defaultValue,
  onChange,
  disabled,
}: {
  label: string;
  name?: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
}) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(
    defaultValue
  );
  const selectedItem = options.find((item) => item.value === selectedValue);

  useEffect(() => {
    onChange?.(selectedValue ?? defaultValue);
  }, [selectedValue]);

  function handleSelect(value: string) {
    setSelectedValue(value);
  }

  return (
    <div className="dropdown">
      <input type="hidden" name={name} value={selectedValue} />
      <button
        tabIndex={0}
        type="button"
        className="btn mb-1"
        disabled={disabled}
      >
        {selectedItem?.label ?? label}
        <TbChevronDown />
      </button>
      <ul
        tabIndex={0}
        className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
      >
        {options.map((item) => (
          <li key={item.value}>
            <a
              onClick={() => handleSelect(item.value)}
              className="flex justify-between"
            >
              {item.label}
              {selectedValue === item.value && <TbCheck />}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
