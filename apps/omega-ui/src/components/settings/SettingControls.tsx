/**
 * Setting Control Components for OMEGA UI
 * @module components/settings/SettingControls
 * @description Reusable setting input controls
 */

/**
 * Toggle setting props
 */
interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle switch setting
 * @param props - Component properties
 * @returns Toggle switch control
 */
export function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-omega-text">{label}</p>
        {description && (
          <p className="text-xs text-omega-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
        } ${checked ? 'bg-omega-primary' : 'bg-omega-border'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Select setting props
 */
interface SelectSettingProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

/**
 * Dropdown select setting
 * @param props - Component properties
 * @returns Select dropdown control
 */
export function SelectSetting({
  label,
  description,
  value,
  onChange,
  options,
  disabled = false,
}: SelectSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-omega-text">{label}</p>
        {description && (
          <p className="text-xs text-omega-muted mt-0.5">{description}</p>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-1.5 text-sm bg-omega-surface border border-omega-border rounded text-omega-text disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Input setting props
 */
interface InputSettingProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'email';
  disabled?: boolean;
}

/**
 * Text input setting
 * @param props - Component properties
 * @returns Text input control
 */
export function InputSetting({
  label,
  description,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
}: InputSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-omega-text">{label}</p>
        {description && (
          <p className="text-xs text-omega-muted mt-0.5">{description}</p>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-32 px-3 py-1.5 text-sm bg-omega-surface border border-omega-border rounded text-omega-text placeholder-omega-muted disabled:opacity-50"
      />
    </div>
  );
}

/**
 * Slider setting props
 */
interface SliderSettingProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
}

/**
 * Range slider setting
 * @param props - Component properties
 * @returns Range slider control
 */
export function SliderSetting({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  showValue = true,
}: SliderSettingProps): JSX.Element {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-medium text-omega-text">{label}</p>
          {description && (
            <p className="text-xs text-omega-muted mt-0.5">{description}</p>
          )}
        </div>
        {showValue && (
          <span className="text-sm text-omega-muted">{value}</span>
        )}
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full h-2 bg-omega-border rounded-lg appearance-none cursor-pointer disabled:opacity-50"
      />
    </div>
  );
}
