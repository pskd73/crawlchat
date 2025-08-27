import { useState } from "react";
import { TbCheck, TbX } from "react-icons/tb";

export type SelectValue = {
  title: string;
  value: string;
};

export function MultiSelect({
  placeholder,
  value,
  onChange,
  selectValues,
}: {
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
  selectValues?: Array<SelectValue>;
}) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>("");

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleAdd() {
    let newValue = inputValue;

    if (selectedValue) {
      newValue = selectedValue;
    }
    onChange([...value, newValue]);
    setInputValue("");
    setSelectedValue(null);
  }

  function getTitle(value: string) {
    return selectValues?.find((v) => v.value === value)?.title ?? value;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {value.map((value, index) => (
          <div
            className="flex gap-2 items-center bg-base-200 rounded-box p-2 pl-4"
            key={index}
          >
            <span className="text-sm">{getTitle(value)}</span>
            <button
              className="btn btn-xs btn-soft btn-square"
              onClick={() => handleRemove(index)}
            >
              <TbX />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {selectValues ? (
          <select
            className="select select-bordered"
            value={selectedValue ?? undefined}
            onChange={(e) => setSelectedValue(e.target.value)}
          >
            <option value="" disabled selected>
              {placeholder ?? "Select"}
            </option>
            {selectValues?.map((value) => (
              <option key={value.value} value={value.value}>
                {value.title}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input"
            placeholder={placeholder ?? "Enter value"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}
        <button
          className="btn"
          disabled={!inputValue && !selectedValue}
          onClick={handleAdd}
        >
          <TbCheck />
        </button>
      </div>
    </div>
  );
}
