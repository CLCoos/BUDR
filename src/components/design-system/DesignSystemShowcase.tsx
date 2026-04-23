'use client';

import React, { useState } from 'react';
import { FileQuestion } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LiveIndicator,
  PageHeader,
  ThemeToggle,
} from '@/components/ui';
import styles from './DesignSystemShowcase.module.css';

export function DesignSystemShowcase() {
  const [cardClicks, setCardClicks] = useState(0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="BUDR Design System"
        subtitle="Lag 1: tokens, tema og UI-primitiver. Brug variabler fra tokens.css — ingen løse hex i komponenter."
        actions={<ThemeToggle />}
      />

      <section className={styles.section} aria-labelledby="ds-typography">
        <h2 id="ds-typography" className={styles.sectionTitle}>
          Typografi
        </h2>
        <Card padding="md">
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-display-sm-size)',
              lineHeight: 'var(--text-display-sm-line-height)',
              margin: 0,
            }}
          >
            Display — DM Serif Display
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-md-size)',
              lineHeight: 'var(--text-body-md-line-height)',
              color: 'var(--text-secondary)',
              margin: 'var(--space-4) 0 0',
            }}
          >
            Body — DM Sans. Monospace:{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>JetBrains Mono</span>
          </p>
        </Card>
      </section>

      <section className={styles.section} aria-labelledby="ds-status">
        <h2 id="ds-status" className={styles.sectionTitle}>
          Status & badges
        </h2>
        <div className={styles.row}>
          <Badge variant="ok">OK</Badge>
          <Badge variant="attention">Opmærksomhed</Badge>
          <Badge variant="action">Handling</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="muted">Muted</Badge>
          <LiveIndicator />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-traffic">
        <h2 id="ds-traffic" className={styles.sectionTitle}>
          Trafiklys (beboer)
        </h2>
        <div className={styles.grid}>
          <div className={styles.swatch} style={{ backgroundColor: 'var(--traffic-red)' }}>
            <span className={styles.swatchLabel}>
              <span className={styles.tokenName}>--traffic-red</span>
            </span>
          </div>
          <div className={styles.swatch} style={{ backgroundColor: 'var(--traffic-yellow)' }}>
            <span className={styles.swatchLabel}>
              <span className={styles.tokenName}>--traffic-yellow</span>
            </span>
          </div>
          <div className={styles.swatch} style={{ backgroundColor: 'var(--traffic-green)' }}>
            <span className={styles.swatchLabel}>
              <span className={styles.tokenName}>--traffic-green</span>
            </span>
          </div>
          <div className={styles.swatch} style={{ backgroundColor: 'var(--traffic-none)' }}>
            <span className={styles.swatchLabel}>
              <span className={styles.tokenName}>--traffic-none</span>
            </span>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-buttons">
        <h2 id="ds-buttons" className={styles.sectionTitle}>
          Knapper
        </h2>
        <div className={styles.row}>
          <Button variant="primary">Primær</Button>
          <Button variant="secondary">Sekundær</Button>
          <Button variant="tertiary">Tertiær</Button>
          <Button variant="destructive">Destruktiv</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loader</Button>
        </div>
        <div className={styles.row} style={{ marginTop: 'var(--space-4)' }}>
          <Button size="sm">Lille</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Stor</Button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-inputs">
        <h2 id="ds-inputs" className={styles.sectionTitle}>
          Felter
        </h2>
        <div style={{ maxWidth: 360 }}>
          <Input label="Titel" placeholder="Fx journalnote" hint="Valgfri hjælpetekst" />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input label="Fejl" defaultValue="Ugyldig" error="Ret venligst feltet." />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-cards">
        <h2 id="ds-cards" className={styles.sectionTitle}>
          Kort
        </h2>
        <div className={styles.grid}>
          <Card statusBorder="ok" padding="md">
            <strong>OK</strong>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-secondary)' }}>
              Statuskant øverst.
            </p>
          </Card>
          <Card statusBorder="attention" padding="md">
            <strong>Opmærksomhed</strong>
          </Card>
          <Card statusBorder="info" padding="md">
            <strong>Info</strong>
          </Card>
          <Card interactive padding="md" onClick={() => setCardClicks((n) => n + 1)}>
            <strong>Interaktivt</strong>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-secondary)' }}>
              Klik / Enter / mellemrum. Antal: {cardClicks}
            </p>
          </Card>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-empty">
        <h2 id="ds-empty" className={styles.sectionTitle}>
          Tom tilstand
        </h2>
        <Card padding="none">
          <EmptyState
            icon={<FileQuestion size={22} aria-hidden />}
            title="Ingen poster endnu"
            description="Når data findes, vises de her. Du kan tilføje den første post med knappen nedenfor."
            actions={
              <>
                <Button variant="primary" size="sm">
                  Opret
                </Button>
                <Button variant="secondary" size="sm">
                  Læs mere
                </Button>
              </>
            }
          />
        </Card>
      </section>
    </div>
  );
}
