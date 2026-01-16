/**
 * Stat Card Component for OMEGA UI
 * @module components/dashboard/StatCard
 * @description Individual statistic display card
 */

/**
 * Stat card props
 */
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: JSX.Element;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

/**
 * Color class mapping
 */
const colorClasses = {
  default: 'text-omega-text',
  primary: 'text-omega-primary',
  success: 'text-green-500',
  warning: 'text-omega-warning',
  error: 'text-omega-error',
};

/**
 * Stat card component
 * @param props - Component properties
 * @returns Statistic display card
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'default',
}: StatCardProps): JSX.Element {
  return (
    <div className="bg-omega-surface rounded-lg p-4 border border-omega-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-omega-muted uppercase tracking-wider">
            {title}
          </p>
          <p className={`text-2xl font-semibold mt-1 ${colorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-omega-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon direction={trend.direction} />
              <span
                className={`text-xs ${
                  trend.direction === 'up'
                    ? 'text-green-500'
                    : trend.direction === 'down'
                    ? 'text-red-500'
                    : 'text-omega-muted'
                }`}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-omega-bg rounded-lg text-omega-muted">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Trend icon component
 */
function TrendIcon({ direction }: { direction: 'up' | 'down' | 'neutral' }): JSX.Element {
  if (direction === 'up') {
    return (
      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 text-omega-muted" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
