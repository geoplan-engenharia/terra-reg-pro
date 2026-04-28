import RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * International phone input with country selector.
 * Defaults to Brazil (+55). Brazilian numbers display as (xx) xxxxx-xxxx automatically
 * via libphonenumber-js national formatting.
 */
export function PhoneInput({ value, onChange, className, placeholder, required }: PhoneInputProps) {
  return (
    <div
      className={cn(
        "geo-phone-input flex h-9 w-full items-center gap-2 rounded-md border border-input bg-input/40 px-3 text-sm focus-within:ring-2 focus-within:ring-ring",
        className
      )}
    >
      <RPNInput
        international
        defaultCountry="BR"
        flags={flags}
        value={value || undefined}
        onChange={(v) => onChange(v ?? "")}
        placeholder={placeholder ?? "(11) 91234-5678"}
        numberInputProps={{
          required,
          className:
            "flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground",
        }}
      />
      <style>{`
        .geo-phone-input .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-right: 4px;
        }
        .geo-phone-input .PhoneInputCountryIcon {
          width: 22px;
          height: 16px;
          box-shadow: none;
          background: transparent;
        }
        .geo-phone-input .PhoneInputCountryIcon img,
        .geo-phone-input .PhoneInputCountryIcon svg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 2px;
        }
        .geo-phone-input .PhoneInputCountrySelectArrow {
          color: hsl(var(--muted-foreground));
          opacity: 0.7;
        }
        .geo-phone-input .PhoneInputCountrySelect {
          background: transparent;
          color: inherit;
        }
      `}</style>
    </div>
  );
}
