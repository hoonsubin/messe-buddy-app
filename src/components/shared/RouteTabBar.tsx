import { cn } from "../../utils/cn.ts";

interface TabItem {
  readonly key: string;
  readonly label: string;
}

interface RouteTabBarProps {
  readonly tabs: ReadonlyArray<TabItem>;
  readonly activeKey: string;
  readonly onChange: (key: string) => void;
  readonly ariaLabel: string;
  /** When set, each tab gets data-testid="{prefix}-{key}". */
  readonly testIdPrefix?: string;
}

const RouteTabBar = ({
  tabs,
  activeKey,
  onChange,
  ariaLabel,
  testIdPrefix,
}: RouteTabBarProps) => (
  <nav
    className="route-tab-bar"
    aria-label={ariaLabel}
  >
    {tabs.map((t) => {
      const active = activeKey === t.key;
      return (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active}
          className={cn("tab-bar__tab", active && "tab-bar__tab--active")}
          onClick={() => onChange(t.key)}
          {...(testIdPrefix !== undefined && {
            "data-testid": `${testIdPrefix}-${t.key}`,
          })}
        >
          {t.label}
        </button>
      );
    })}
  </nav>
);

export default RouteTabBar;
