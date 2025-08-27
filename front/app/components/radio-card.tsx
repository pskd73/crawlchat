import cn from "@meltdownjs/cn";
import { TbCheck } from "react-icons/tb";

export type RadioCardOption = {
  label: string;
  value: string;
  description?: string;
  summary?: string;
  disabled?: boolean;
  content?: React.ReactNode;
  icon?: React.ReactNode;
};

export function RadioCard({
  options,
  name,
  value,
  onChange,
}: {
  options: RadioCardOption[];
  name?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <input type="hidden" name={name} value={value} />
      {options.map((option) => (
        <div
          key={option.value}
          className={cn(
            "flex gap-2 flex-1 border border-base-300 p-4 bg-base-100",
            "rounded-box justify-between cursor-pointer",
            value === option.value && "border-primary outline outline-primary",
            option.disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => {
            if (option.disabled) {
              return;
            }
            onChange(option.value);
          }}
        >
          <div className="flex flex-col gap-1">
            {option.icon && (
              <div className="text-2xl">{option.icon}</div>
            )}
            <span className="font-medium">{option.label}</span>
            {option.summary && (
              <span className="text-xs text-base-content/50">
                {option.summary}
              </span>
            )}
            {option.description && (
              <span className="text-sm text-base-content/50">
                {option.description}
              </span>
            )}
            {option.content}
          </div>
          <div>
            <TbCheck
              className={cn(
                "text-2xl",
                value !== option.value && "text-base-content/20",
                value === option.value && "text-primary"
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
