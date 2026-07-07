import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn.ts";

export interface RouteTabItem {
  readonly key: string;
  readonly label: string;
  readonly to: string;
  /** When true, only an exact path match marks this tab active. */
  readonly end?: boolean;
}

interface RouteTabBarProps {
  readonly tabs: ReadonlyArray<RouteTabItem>;
  readonly ariaLabel: string;
  /** When set, each tab gets data-testid="{prefix}-{key}". */
  readonly testIdPrefix?: string;
}

const RouteTabBar = ({ tabs, ariaLabel, testIdPrefix }: RouteTabBarProps) => (
  <nav
    className="route-tab-bar"
    aria-label={ariaLabel}
  >
    {tabs.map((t) => (
      <NavLink
        key={t.key}
        to={t.to}
        end={t.end ?? false}
        role="tab"
        className={({ isActive }) =>
          cn("tab-bar__tab", isActive && "tab-bar__tab--active")}
        {...(testIdPrefix !== undefined && {
          "data-testid": `${testIdPrefix}-${t.key}`,
        })}
      >
        {t.label}
      </NavLink>
    ))}
  </nav>
);

export default RouteTabBar;
