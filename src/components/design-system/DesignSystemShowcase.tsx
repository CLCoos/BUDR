'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileQuestion, Home, Search } from 'lucide-react';
import { applyBudrTheme, readStoredBudrTheme, type BudrTheme } from '@/lib/budrTheme';
import { Badge, Button, Card, EmptyState, Input, LiveIndicator, PageHeader } from '@/components/ui';
import styles from './DesignSystemShowcase.module.css';

const sections = [
  'Farver',
  'Typografi',
  'Spacing',
  'Button',
  'Card',
  'EmptyState',
  'Input',
  'Badge',
  'PageHeader',
  'LiveIndicator',
] as const;

const colorTokens = [
  { name: '--brand-primary', hex: '#2DD4A5' },
  { name: '--brand-primary-hover', hex: '#25B890' },
  { name: '--brand-primary-dim', hex: '#1F9578' },
  { name: '--brand-accent', hex: '#D97757' },
  { name: '--status-ok', hex: '#10B981' },
  { name: '--status-attention', hex: '#F59E0B' },
  { name: '--status-action', hex: '#EF4444' },
  { name: '--status-neutral', hex: '#3B82F6' },
  { name: '--status-info', hex: '#8B5CF6' },
  { name: '--status-ok-bg', hex: 'rgba(16,185,129,0.12)' },
  { name: '--status-attention-bg', hex: 'rgba(245,158,11,0.12)' },
  { name: '--status-action-bg', hex: 'rgba(239,68,68,0.12)' },
  { name: '--status-neutral-bg', hex: 'rgba(59,130,246,0.12)' },
  { name: '--status-info-bg', hex: 'rgba(139,92,246,0.12)' },
  { name: '--traffic-red', hex: '#DC2626' },
  { name: '--traffic-yellow', hex: '#EAB308' },
  { name: '--traffic-green', hex: '#16A34A' },
  { name: '--traffic-none', hex: '#6B7280' },
  { name: '--bg-canvas', hex: '#0A0B0D' },
  { name: '--bg-surface', hex: '#13151A' },
  { name: '--bg-surface-2', hex: '#1A1D24' },
  { name: '--bg-surface-3', hex: '#22262F' },
  { name: '--border-subtle', hex: '#1F232B' },
  { name: '--border-default', hex: '#2A2F38' },
  { name: '--border-strong', hex: '#3A414D' },
  { name: '--text-primary', hex: '#F5F7FA' },
  { name: '--text-secondary', hex: '#A8B0BD' },
  { name: '--text-tertiary', hex: '#6B7280' },
];

const spacingTokens = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'] as const;

const typographyRows = [
  {
    token: 'text-display-xl',
    text: 'Varm Praecision',
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-display-xl-size)',
      lineHeight: 'var(--text-display-xl-line-height)',
    },
  },
  {
    token: 'text-display-lg',
    text: 'Varm Praecision',
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-display-lg-size)',
      lineHeight: 'var(--text-display-lg-line-height)',
    },
  },
  {
    token: 'text-display-md',
    text: 'Varm Praecision',
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-display-md-size)',
      lineHeight: 'var(--text-display-md-line-height)',
    },
  },
  {
    token: 'text-display-sm',
    text: 'Varm Praecision',
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-display-sm-size)',
      lineHeight: 'var(--text-display-sm-line-height)',
    },
  },
  {
    token: 'text-heading-lg',
    text: 'Journal og overblik',
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-heading-lg-size)',
      lineHeight: 'var(--text-heading-lg-line-height)',
      fontWeight: 600,
    },
  },
  {
    token: 'text-heading-md',
    text: 'Journal og overblik',
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-heading-md-size)',
      lineHeight: 'var(--text-heading-md-line-height)',
      fontWeight: 600,
    },
  },
  {
    token: 'text-body-lg',
    text: 'Stabilt hverdagssprog med tydelig handling.',
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body-lg-size)',
      lineHeight: 'var(--text-body-lg-line-height)',
    },
  },
  {
    token: 'text-body-md',
    text: 'Stabilt hverdagssprog med tydelig handling.',
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body-md-size)',
      lineHeight: 'var(--text-body-md-line-height)',
    },
  },
  {
    token: 'text-body-sm',
    text: 'Stabilt hverdagssprog med tydelig handling.',
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body-sm-size)',
      lineHeight: 'var(--text-body-sm-line-height)',
    },
  },
  {
    token: 'text-label',
    text: 'AKTIVE BEBOERE',
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-label-size)',
      lineHeight: 'var(--text-label-line-height)',
      letterSpacing: 'var(--text-label-letter-spacing)',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
  },
];

export function DesignSystemShowcase() {
  const [theme, setTheme] = useState<BudrTheme>('dark');
  const [focusCount, setFocusCount] = useState(0);

  useEffect(() => {
    const initial = readStoredBudrTheme();
    setTheme(initial);
    applyBudrTheme(initial);
  }, []);

  const buttonVariants = useMemo(
    () => ['primary', 'secondary', 'tertiary', 'destructive', 'ghost'] as const,
    []
  );
  const buttonSizes = useMemo(() => ['sm', 'md', 'lg'] as const, []);
  const badgeVariants = useMemo(
    () => ['ok', 'attention', 'action', 'neutral', 'info', 'muted'] as const,
    []
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <h1 className={styles.title}>BUDR Design System v1.0</h1>
          <label>
            <span className={styles.mono}>Tema:</span>{' '}
            <select
              className={styles.themeSelect}
              value={theme}
              onChange={(e) => {
                const next = e.target.value as BudrTheme;
                setTheme(next);
                applyBudrTheme(next);
              }}
            >
              <option value="dark">mork</option>
              <option value="light">lyst</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.toc}>
          <p className={styles.tocTitle}>Indholdsfortegnelse</p>
          <nav className={styles.tocList}>
            {sections.map((section) => (
              <a key={section} className={styles.tocLink} href={`#${section.toLowerCase()}`}>
                {section}
              </a>
            ))}
          </nav>
        </aside>

        <main className={styles.content}>
          <section id="farver" className={styles.section}>
            <h2 className={styles.sectionTitle}>Farver</h2>
            <div className={styles.tokensGrid}>
              {colorTokens.map((token) => (
                <div
                  key={token.name}
                  className={styles.swatch}
                  style={{ background: `var(${token.name})` }}
                >
                  <span className={styles.swatchName}>{token.name}</span>
                  <span className={styles.swatchHex}>{token.hex}</span>
                </div>
              ))}
            </div>
            <pre className={styles.code}>
              <code>{`import '@/app/design-system/tokens.css';`}</code>
            </pre>
          </section>

          <section id="typografi" className={styles.section}>
            <h2 className={styles.sectionTitle}>Typografi</h2>
            <div className={styles.stack}>
              {typographyRows.map((row) => (
                <div key={row.token} className={styles.typeItem}>
                  <span className={styles.typeLabel}>{row.token}</span>
                  <span style={row.style}>{row.text}</span>
                </div>
              ))}
            </div>
            <pre className={styles.code}>
              <code>{`<p style={{ fontSize: 'var(--text-body-md-size)' }}>Eksempeltekst</p>`}</code>
            </pre>
          </section>

          <section id="spacing" className={styles.section}>
            <h2 className={styles.sectionTitle}>Spacing</h2>
            <div className={styles.stack}>
              {spacingTokens.map((space) => (
                <div className={styles.spacingItem} key={space}>
                  <span className={styles.typeLabel}>{`space-${space}`}</span>
                  <div className={styles.spacingBar} style={{ height: `var(--space-${space})` }} />
                </div>
              ))}
            </div>
            <pre className={styles.code}>
              <code>{`<div style={{ padding: 'var(--space-4)' }} />`}</code>
            </pre>
          </section>

          <section id="button" className={styles.section}>
            <h2 className={styles.sectionTitle}>Button</h2>
            <div className={styles.componentGrid}>
              {buttonVariants.map((variant) =>
                buttonSizes.map((size) => (
                  <Card key={`${variant}-${size}`} padding="sm">
                    <div className={styles.stack}>
                      <span className={styles.mono}>{`${variant} / ${size}`}</span>
                      <Button variant={variant} size={size}>
                        Handling
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
            <div className={styles.demoBlock}>
              <div className={styles.row}>
                <Button variant="primary" leftIcon={<Home size={14} aria-hidden />}>
                  Left icon
                </Button>
                <Button variant="secondary" rightIcon={<Eye size={14} aria-hidden />}>
                  Right icon
                </Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button fullWidth>Full width</Button>
              </div>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button onClick={() => setFocusCount((n) => n + 1)}>
                  Interaktiv test (klik: {focusCount})
                </Button>
              </div>
            </div>
            <pre className={styles.code}>
              <code>{`import { Button } from '@/components/ui';\n\n<Button variant="secondary" size="md">Gem</Button>`}</code>
            </pre>
          </section>

          <section id="card" className={styles.section}>
            <h2 className={styles.sectionTitle}>Card</h2>
            <div className={styles.componentGrid}>
              <Card padding="md">Default</Card>
              <Card statusBorder="ok">ok</Card>
              <Card statusBorder="attention">attention</Card>
              <Card statusBorder="action">action</Card>
              <Card statusBorder="neutral">neutral</Card>
              <Card statusBorder="info">info</Card>
              <Card padding="none">padding none</Card>
              <Card padding="sm">padding sm</Card>
              <Card padding="md">padding md</Card>
              <Card padding="lg">padding lg</Card>
              <Card interactive onClick={() => setFocusCount((n) => n + 1)}>
                interactive=true (klik)
              </Card>
            </div>
            <pre className={styles.code}>
              <code>{`import { Card } from '@/components/ui';\n\n<Card statusBorder="ok" padding="md">Indhold</Card>`}</code>
            </pre>
          </section>

          <section id="emptystate" className={styles.section}>
            <h2 className={styles.sectionTitle}>EmptyState</h2>
            <div className={styles.componentGrid}>
              <Card padding="none">
                <EmptyState variant="default" title="Ingen journalnotater i dag" />
              </Card>
              <Card padding="none">
                <EmptyState
                  variant="positive"
                  icon={<FileQuestion size={20} aria-hidden />}
                  title="Alt roligt i dag"
                  description="Ingen akutte afvigelser registreret."
                />
              </Card>
              <Card padding="none">
                <EmptyState
                  variant="action"
                  icon={<FileQuestion size={20} aria-hidden />}
                  title="18 beboere mangler check-in"
                  actions={<Button size="sm">Start check-in</Button>}
                />
              </Card>
            </div>
            <pre className={styles.code}>
              <code>{`import { EmptyState } from '@/components/ui';\n\n<EmptyState variant="action" title="18 beboere mangler check-in" />`}</code>
            </pre>
          </section>

          <section id="input" className={styles.section}>
            <h2 className={styles.sectionTitle}>Input</h2>
            <div className={styles.componentGrid}>
              <Card>
                <Input inputSize="sm" label="Small" placeholder="small input" />
              </Card>
              <Card>
                <Input
                  inputSize="md"
                  label="Medium"
                  hint="Med hint-tekst"
                  placeholder="medium input"
                />
              </Card>
              <Card>
                <Input inputSize="lg" label="Large" placeholder="large input" />
              </Card>
              <Card>
                <Input label="Error" defaultValue="Forkert værdi" error="Ret feltet." />
              </Card>
              <Card>
                <Input
                  label="Søgning"
                  leftIcon={<Search size={14} aria-hidden />}
                  placeholder="Søg..."
                />
              </Card>
              <Card>
                <Input
                  label="Password"
                  type="password"
                  rightElement={<Eye size={14} aria-hidden />}
                  placeholder="••••••••"
                />
              </Card>
              <Card>
                <Input label="Disabled" placeholder="Deaktiveret" disabled />
              </Card>
            </div>
            <pre className={styles.code}>
              <code>{`import { Input } from '@/components/ui';\n\n<Input label="Søgning" leftIcon={<Search />} />`}</code>
            </pre>
          </section>

          <section id="badge" className={styles.section}>
            <h2 className={styles.sectionTitle}>Badge</h2>
            <div className={styles.stack}>
              {badgeVariants.map((variant) => (
                <div key={variant} className={styles.row}>
                  <span className={styles.typeLabel}>{variant}</span>
                  <Badge variant={variant} size="sm">
                    sm
                  </Badge>
                  <Badge variant={variant} size="sm" dot>
                    sm dot
                  </Badge>
                  <Badge variant={variant} size="md">
                    md
                  </Badge>
                  <Badge variant={variant} size="md" dot>
                    md dot
                  </Badge>
                </div>
              ))}
            </div>
            <pre className={styles.code}>
              <code>{`import { Badge } from '@/components/ui';\n\n<Badge variant="ok" size="sm" dot>Live</Badge>`}</code>
            </pre>
          </section>

          <section id="pageheader" className={styles.section}>
            <h2 className={styles.sectionTitle}>PageHeader</h2>
            <Card>
              <PageHeader
                title="Borgeroversigt"
                subtitle="Overblik over dagens status og handlinger."
                breadcrumbs={
                  <>
                    <span>Care Portal</span>
                    <span>/</span>
                    <span>Dashboard</span>
                  </>
                }
                liveIndicator={
                  <>
                    <LiveIndicator />
                    <LiveIndicator live={false} />
                  </>
                }
                tabs={['Overblik', 'Journal', 'Plan']}
                activeTab="Overblik"
                actions={
                  <>
                    <Button size="sm" variant="secondary">
                      Eksport
                    </Button>
                    <Button size="sm" variant="ghost">
                      Del
                    </Button>
                    <Button size="sm">Ny note</Button>
                  </>
                }
              />
            </Card>
            <pre className={styles.code}>
              <code>{`import { PageHeader } from '@/components/ui';\n\n<PageHeader title="Borgeroversigt" tabs={['Overblik', 'Journal', 'Plan']} />`}</code>
            </pre>
          </section>

          <section id="liveindicator" className={styles.section}>
            <h2 className={styles.sectionTitle}>LiveIndicator</h2>
            <div className={styles.row}>
              <LiveIndicator live />
              <LiveIndicator live={false} />
            </div>
            <pre className={styles.code}>
              <code>{`import { LiveIndicator } from '@/components/ui';\n\n<LiveIndicator live={false} />`}</code>
            </pre>
          </section>
        </main>
      </div>
    </div>
  );
}
