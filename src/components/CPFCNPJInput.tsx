import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "/" + p4;
  if (p5) out += "-" + p5;
  return out;
}

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

/** Pure CPF input (xxx.xxx.xxx-xx) */
export function CPFInput({ value, onChange, className, required, placeholder, id }: CPFInputProps) {
  return (
    <input
      id={id}
      required={required}
      value={maskCPF(value)}
      placeholder={placeholder ?? "000.000.000-00"}
      inputMode="numeric"
      maxLength={14}
      onChange={(e) => onChange(maskCPF(e.target.value))}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-input/40 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    />
  );
}

/** Combined CPF / CNPJ input with toggle. Stored value comes prefixed: "CPF: ..." or "CNPJ: ..." */
interface CPFCNPJProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function detectKind(v: string): "CPF" | "CNPJ" {
  if (v.startsWith("CNPJ")) return "CNPJ";
  if (v.startsWith("CPF")) return "CPF";
  // fallback by digit count
  return onlyDigits(v).length > 11 ? "CNPJ" : "CPF";
}

function stripPrefix(v: string): string {
  return v.replace(/^(CPF|CNPJ):\s*/i, "");
}

export function CPFCNPJInput({ value, onChange, className }: CPFCNPJProps) {
  const [kind, setKind] = useState<"CPF" | "CNPJ">(() => detectKind(value));
  const [raw, setRaw] = useState<string>(() => stripPrefix(value));

  useEffect(() => {
    const k = detectKind(value);
    setKind(k);
    setRaw(stripPrefix(value));
  }, [value]);

  const handleRawChange = (next: string) => {
    const masked = kind === "CPF" ? maskCPF(next) : maskCNPJ(next);
    setRaw(masked);
    onChange(masked ? `${kind}: ${masked}` : "");
  };

  const handleKindChange = (k: "CPF" | "CNPJ") => {
    setKind(k);
    setRaw("");
    onChange("");
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <select
        value={kind}
        onChange={(e) => handleKindChange(e.target.value as "CPF" | "CNPJ")}
        className="h-9 rounded-md border border-input bg-input/40 px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="CPF">CPF</option>
        <option value="CNPJ">CNPJ</option>
      </select>
      <input
        value={raw}
        onChange={(e) => handleRawChange(e.target.value)}
        inputMode="numeric"
        maxLength={kind === "CPF" ? 14 : 18}
        placeholder={kind === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
        className="h-9 flex-1 rounded-md border border-input bg-input/40 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
