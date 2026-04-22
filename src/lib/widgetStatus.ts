/**
 * Statusfarver til dashboard-widget top-borders (Care Portal).
 * CSS: --status-ok, --status-attention, --status-action, --status-neutral
 */

export type WidgetStatusKey = 'ok' | 'attention' | 'action' | 'neutral';

export type WidgetStatusMetric =
  | 'stat_active_residents'
  | 'stat_checkins_today'
  | 'stat_open_alerts'
  | 'stat_avg_mood'
  | 'widget_alert_list'
  | 'widget_residents_list'
  | 'widget_medicin_today';

export type WidgetStatusContext = {
  /** Aktive beboere (til check-in-procent) */
  totalResidents?: number;
  /** Unikke beboere med check-in i dag */
  checkinTodayCount?: number;
  /** Åbne advarsler (samme tælling som nøgletal) */
  openAlertCount?: number;
  /** Gns. stemning fra dagens check-ins; null = ingen data */
  avgMood?: number | null;
  /** Forsinkede medicin-åbninger (ikke udleveret, planlagt tid passeret) */
  delayedMedicationCount?: number;
  /** Lokal time — time 0–23 (fx `new Date().getHours()`) */
  nowHour?: number;
};

export function widgetStatusVar(status: WidgetStatusKey): string {
  return `var(--status-${status})`;
}

export function getWidgetStatus(
  metric: WidgetStatusMetric,
  ctx: WidgetStatusContext = {}
): WidgetStatusKey {
  switch (metric) {
    case 'stat_active_residents':
    case 'widget_residents_list':
      return 'neutral';

    case 'stat_open_alerts':
    case 'widget_alert_list': {
      const n = ctx.openAlertCount ?? 0;
      if (n === 0) return 'ok';
      if (n <= 3) return 'attention';
      return 'action';
    }

    case 'stat_avg_mood': {
      const checked = ctx.checkinTodayCount ?? 0;
      if (checked === 0) return 'attention';
      if (ctx.avgMood != null && !Number.isNaN(ctx.avgMood)) return 'neutral';
      return 'attention';
    }

    case 'stat_checkins_today': {
      const total = ctx.totalResidents ?? 0;
      const hour = ctx.nowHour ?? new Date().getHours();
      if (total <= 0) return 'neutral';
      const done = ctx.checkinTodayCount ?? 0;
      const pct = (done / total) * 100;
      if (hour < 10) return 'neutral';
      if (pct >= 80) return 'ok';
      if (pct >= 30) return 'attention';
      return 'action';
    }

    case 'widget_medicin_today': {
      const d = ctx.delayedMedicationCount ?? 0;
      if (d === 0) return 'ok';
      if (d <= 2) return 'attention';
      return 'action';
    }

    default:
      return 'neutral';
  }
}
