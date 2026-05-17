'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDownAZ, ArrowUpDown, BookOpen, Users } from 'lucide-react';
import {
  residentNameRoomInitialsMatch,
  sortResidentsBySearchRelevance,
} from '@/lib/residentSearchMatch';
import { copenhagenIsAtOrAfterClock } from '@/lib/copenhagenDay';
import type { ResidentItem, TrafficUi } from '../residentOverviewTypes';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import {
  onboardingHouseToCareHouse,
  parseCarePortalDepartment,
  type CarePortalDepartment,
} from '@/lib/carePortalHouse';
import { CARE_PORTAL_DEPARTMENT_OPTIONS } from '@/lib/careDemoResidents';
import type { TrafficFilterValue } from '@/components/patterns/TrafficLightFilter';
import { FilterBar, FilterBarDensityToggle } from '@/components/patterns/FilterBar';
import { ResidentRow, type ResidentQuickAction } from '@/components/patterns/ResidentRow';
import { PageHeader } from '@/components/ui/PageHeader';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import styles from './ResidentOverviewGrid.module.css';

const HOUSE_ORDER = ['Hus A', 'Hus B', 'Hus C', 'Hus D', 'TLS', '—'];

function houseRank(h: string): number {
  const i = HOUSE_ORDER.indexOf(h);
  return i === -1 ? 99 : i;
}

function trafficRank(tl: TrafficUi | null): number {
  if (tl === 'roed') return 0;
  if (tl === 'gul') return 1;
  if (tl === 'groen') return 2;
  return 3;
}

type SortKey = 'status' | 'name' | 'checkin';
type SortDir = 'asc' | 'desc';

const NAME_TIP_KEY = (orgId: string) => `budr-resident-name-tip-dismissed-${orgId}`;

type Props = { residents: ResidentItem[]; orgId: string };

export default function ResidentOverviewGrid({ residents, orgId }: Props) {
  const router = useRouter();
  const { department, setDepartment } = useCarePortalDepartment();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TrafficFilterValue>('all');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [nameTipDismissed, setNameTipDismissed] = useState(false);
  const [nameTipReady, setNameTipReady] = useState(false);
  const [afterTenToday, setAfterTenToday] = useState(false);

  useEffect(() => {
    try {
      setNameTipDismissed(localStorage.getItem(NAME_TIP_KEY(orgId)) === '1');
    } catch {
      setNameTipDismissed(false);
    } finally {
      setNameTipReady(true);
    }
  }, [orgId]);

  useEffect(() => {
    const tick = () => {
      setAfterTenToday(copenhagenIsAtOrAfterClock(new Date(), 10, 0));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const dismissNameTip = useCallback(() => {
    setNameTipDismissed(true);
    try {
      localStorage.setItem(NAME_TIP_KEY(orgId), '1');
    } catch {
      /* ignore */
    }
  }, [orgId]);

  const incompleteNameCount = useMemo(
    () => residents.filter((r) => r.nameFieldsMissing).length,
    [residents]
  );

  const residentsInDept = useMemo(() => {
    if (department === 'alle') return residents;
    return residents.filter((r) => onboardingHouseToCareHouse(r.house) === department);
  }, [residents, department]);

  const trafficCounts = useMemo(
    () => ({
      all: residentsInDept.length,
      red: residentsInDept.filter((r) => r.trafficLight === 'roed').length,
      yellow: residentsInDept.filter((r) => r.trafficLight === 'gul').length,
      green: residentsInDept.filter((r) => r.trafficLight === 'groen').length,
      none: residentsInDept.filter((r) => !r.trafficLight).length,
    }),
    [residentsInDept]
  );

  const sortedBase = useMemo(() => {
    const copy = [...residentsInDept];
    const cmpStatus = (a: ResidentItem, b: ResidentItem) => {
      const ta = trafficRank(a.trafficLight);
      const tb = trafficRank(b.trafficLight);
      if (ta !== tb) return ta - tb;
      // Uden check-in i dag først (inden for samme trafiklys)
      if (a.checkinToday !== b.checkinToday) {
        return (a.checkinToday ? 1 : 0) - (b.checkinToday ? 1 : 0);
      }
      return (
        houseRank(a.house) - houseRank(b.house) ||
        a.name.localeCompare(b.name, 'da', { sensitivity: 'base' })
      );
    };
    const cmpName = (a: ResidentItem, b: ResidentItem) =>
      a.name.localeCompare(b.name, 'da', { sensitivity: 'base' });
    const cmpCheckin = (a: ResidentItem, b: ResidentItem) => {
      if (!a.lastCheckinIso && !b.lastCheckinIso) return 0;
      if (!a.lastCheckinIso) return 1;
      if (!b.lastCheckinIso) return -1;
      return a.lastCheckinIso.localeCompare(b.lastCheckinIso);
    };

    if (sortKey === 'status') {
      copy.sort((a, b) => (sortDir === 'asc' ? 1 : -1) * cmpStatus(a, b));
      return copy;
    }
    if (sortKey === 'name') {
      copy.sort((a, b) => (sortDir === 'asc' ? 1 : -1) * cmpName(a, b));
      return copy;
    }
    copy.sort((a, b) => (sortDir === 'asc' ? 1 : -1) * cmpCheckin(a, b));
    return copy;
  }, [residentsInDept, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const ql = search.trim().toLowerCase();
    const base = sortedBase.filter((r) => {
      const matchSearch =
        residentNameRoomInitialsMatch(r.name, r.room, r.initials, search) ||
        (ql.length > 0 && r.house.toLowerCase().includes(ql));
      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'none'
            ? !r.trafficLight
            : (filter === 'red' ? 'roed' : filter === 'yellow' ? 'gul' : 'groen') ===
              r.trafficLight;
      return matchSearch && matchFilter;
    });
    const q = search.trim();
    return q ? sortResidentsBySearchRelevance(base, q) : base;
  }, [sortedBase, search, filter]);

  const checkinCount = residentsInDept.filter((r) => r.checkinToday).length;
  const missingCheckin = residentsInDept.length - checkinCount;
  const alertCount = residentsInDept.filter((r) => r.trafficLight === 'roed').length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'checkin' ? 'desc' : 'asc');
    }
  };

  const deptOptions = useMemo(
    () => [
      { value: 'alle', label: 'Alle huse' },
      ...CARE_PORTAL_DEPARTMENT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    ],
    []
  );

  const onDeptChange = (value: string) => {
    setDepartment(parseCarePortalDepartment(value) as CarePortalDepartment);
  };

  const onQuickAction = (r: ResidentItem, action: ResidentQuickAction) => {
    const base = `/resident-360-view/${r.id}`;
    if (action === 'note') {
      router.push(`${base}?tab=overblik&writeJournal=1`);
      return;
    }
    if (action === 'medication') {
      router.push(`${base}?tab=medicin`);
      return;
    }
    if (action === 'check-in') {
      router.push(`${base}?tab=overblik#resident-park-checkin`);
      return;
    }
    router.push(`${base}?tab=overblik`);
  };

  const subtitle = (
    <>
      <span className={styles.subtitleStrong}>{residentsInDept.length}</span> beboere i udvalg ·{' '}
      <span className={styles.subtitleStrong}>{checkinCount}</span> check-in i dag
      {afterTenToday && missingCheckin > 0 ? (
        <>
          {' '}
          · <span className={styles.subtitleWarn}>{missingCheckin} mangler check-in</span>
        </>
      ) : missingCheckin > 0 ? (
        <> · {missingCheckin} mangler check-in</>
      ) : null}
      {alertCount > 0 ? (
        <>
          {' '}
          · <span style={{ color: 'var(--cp-red)', fontWeight: 600 }}>{alertCount} rød</span>
        </>
      ) : null}
    </>
  );

  const showNameTip = nameTipReady && incompleteNameCount > 0 && !nameTipDismissed;

  if (residents.length === 0) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Beboere"
          subtitle="Oversigt over alle beboere med daglig status."
          liveIndicator={<LiveIndicator label="Live data" />}
          actions={
            <Link
              href="/resident-360-view/dagbog"
              className="text-sm font-semibold shrink-0 hover:underline"
              style={{ color: 'var(--cp-green)' }}
            >
              Aftenopsamling →
            </Link>
          }
        />
        <div className={styles.emptyPad}>
          <EmptyState
            variant="action"
            icon={<Users size={28} strokeWidth={1.5} />}
            title="Ingen beboere endnu"
            description="Når beboere er tilknyttet organisationen, vises de her med check-in og stemning."
            actions={
              <Link
                href="/care-portal-dashboard/settings"
                className="text-sm font-semibold"
                style={{ color: 'var(--cp-green)' }}
              >
                Gå til indstillinger
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (residentsInDept.length === 0 && department !== 'alle') {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Beboere"
          subtitle={subtitle}
          liveIndicator={<LiveIndicator label="Live data" />}
          actions={
            <Link
              href="/resident-360-view/dagbog"
              className="text-sm font-semibold shrink-0 hover:underline"
              style={{ color: 'var(--cp-green)' }}
            >
              Aftenopsamling →
            </Link>
          }
        />
        <FilterBar
          searchPlaceholder="Søg initialer, navn, værelse eller hus…"
          searchValue={search}
          onSearchChange={setSearch}
          trafficFilter={filter}
          onTrafficFilterChange={setFilter}
          trafficCounts={trafficCounts}
          departmentLabel="Hus"
          departmentOptions={deptOptions}
          departmentValue={department}
          onDepartmentChange={onDeptChange}
          actions={
            <FilterBarDensityToggle
              density={density}
              onToggle={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            />
          }
        />
        <div className={styles.emptyPad}>
          <EmptyState
            icon={<Users size={28} strokeWidth={1.5} />}
            title="Ingen beboere i dette hus"
            description="Skift hus-filter eller vælg «Alle huse» for at se hele listen."
            actions={
              <button
                type="button"
                className="text-sm font-semibold"
                style={{
                  color: 'var(--cp-green)',
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                }}
                onClick={() => setDepartment('alle')}
              >
                Vis alle huse
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Beboere"
        subtitle={subtitle}
        liveIndicator={<LiveIndicator label="Live data" />}
        actions={
          <Link
            href="/resident-360-view/dagbog"
            className="text-sm font-semibold shrink-0 hover:underline"
            style={{ color: 'var(--cp-green)' }}
          >
            Aftenopsamling →
          </Link>
        }
      />

      {showNameTip ? (
        <div className={styles.nameTip} role="status">
          <p style={{ margin: 0 }}>
            <strong>{incompleteNameCount}</strong> beboer{incompleteNameCount === 1 ? '' : 'e'}{' '}
            mangler fornavn eller efternavn i registret. Navne kan se ufuldstændige ud — ret i{' '}
            <Link
              href="/care-portal-dashboard/settings"
              style={{ color: 'var(--cp-green)', fontWeight: 600 }}
            >
              indstillinger
            </Link>
            .
          </p>
          <button type="button" className={styles.nameTipDismiss} onClick={dismissNameTip}>
            Skjul
          </button>
        </div>
      ) : null}

      <div className={styles.card}>
        <FilterBar
          stickyOnMobile
          searchPlaceholder="Søg initialer, navn, værelse eller hus…"
          searchValue={search}
          onSearchChange={setSearch}
          trafficFilter={filter}
          onTrafficFilterChange={setFilter}
          trafficCounts={trafficCounts}
          departmentLabel="Hus"
          departmentOptions={deptOptions}
          departmentValue={department}
          onDepartmentChange={onDeptChange}
          actions={
            <FilterBarDensityToggle
              density={density}
              onToggle={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            />
          }
        />

        {filtered.length === 0 ? (
          <div className={styles.emptyPad}>
            <EmptyState
              variant="default"
              icon={<BookOpen size={28} strokeWidth={1.5} />}
              title="Ingen beboere matcher"
              description="Prøv at rydde søgning eller vælge et andet trafiklys-filter."
              actions={
                <button
                  type="button"
                  className="text-sm font-semibold"
                  style={{
                    color: 'var(--cp-green)',
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                >
                  Nulstil filtre
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className={styles.sortHead} aria-hidden={false}>
              <button
                type="button"
                className={cn(styles.sortBtn, sortKey === 'name' && styles.sortBtnActive)}
                onClick={() => toggleSort('name')}
              >
                Beboer
                <ArrowDownAZ size={12} />
              </button>
              <button
                type="button"
                className={cn(styles.sortBtn, sortKey === 'status' && styles.sortBtnActive)}
                onClick={() => toggleSort('status')}
              >
                Trafik
                <ArrowUpDown size={12} />
              </button>
              <span className={styles.sortBtn}>Stemning</span>
              <button
                type="button"
                className={cn(styles.sortBtn, sortKey === 'checkin' && styles.sortBtnActive)}
                onClick={() => toggleSort('checkin')}
              >
                Check-in
                <ArrowUpDown size={12} />
              </button>
              <span />
            </div>
            {filtered.map((r, index) => (
              <div key={r.id} className={cn(styles.rowWrap, index % 2 === 1 && styles.rowWrapAlt)}>
                <ResidentRow
                  resident={r}
                  density={density}
                  onRowClick={() => router.push(`/resident-360-view/${r.id}`)}
                  onQuickAction={(action) => onQuickAction(r, action)}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
