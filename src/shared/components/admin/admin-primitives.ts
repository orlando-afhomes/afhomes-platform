/**
 * Admin KPI, section, empty, and error primitives. Single implementation lives
 * in the dashboard kit; these aliases give every admin page the same names.
 */
export {
  DashboardKpiGrid as AdminKpiGrid,
  DashboardKpiCard as AdminKpiCard,
  type DashboardKpiTrend as AdminKpiTrend,
} from "../dashboard/dashboard-kpi";
export {
  DashboardCard as AdminSection,
  DashboardEmptyState as AdminEmpty,
  DashboardError as AdminError,
  type DashboardTone as AdminTone,
  DASHBOARD_TONE_CLASSES as ADMIN_TONE_CLASSES,
  DASHBOARD_TONE_COLORS as ADMIN_TONE_COLORS,
} from "../dashboard/dashboard-layout";
