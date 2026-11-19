import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'> & {
  value: number; min: number; max: number; onValueChange: (value: number) => void;
};

export default function BoundedNumberInput({ value, min, max, onValueChange, ...props }: Props) {
  return <input {...props} type="number" inputMode="decimal" min={min} max={max} step="0.1"
    value={Number.isNaN(value) ? '' : value}
    onKeyDown={event => {
      if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
    }} onChange={event => {
      const raw = event.target.value;
      if (raw === '') { onValueChange(NaN); return; }
      // Trim extra decimal digits and clamp before updating the controlled field.
      const limited = Math.min(max, Math.max(min, Number(raw.replace(/(\.\d).*/, '$1'))));
      if (!Number.isFinite(limited)) return;
      if (Number(raw) !== limited) event.target.value = String(limited);
      onValueChange(limited);
    }}/ >;
}
