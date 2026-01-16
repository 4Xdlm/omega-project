/**
 * Settings Section Component for OMEGA UI
 * @module components/settings/SettingsSection
 * @description Groupable settings section container
 */

/**
 * Settings section props
 */
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: JSX.Element;
}

/**
 * Settings section container
 * @param props - Component properties
 * @returns Settings section wrapper
 */
export function SettingsSection({
  title,
  description,
  children,
  icon,
}: SettingsSectionProps): JSX.Element {
  return (
    <div className="bg-omega-surface rounded-lg border border-omega-border overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-omega-border bg-omega-bg/50">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-omega-muted">{icon}</div>
          )}
          <div>
            <h3 className="text-sm font-medium text-omega-text">{title}</h3>
            {description && (
              <p className="text-xs text-omega-muted mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div className="px-4 divide-y divide-omega-border">
        {children}
      </div>
    </div>
  );
}
