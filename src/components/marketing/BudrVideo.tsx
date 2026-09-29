'use client';

import { useRef } from 'react';
import { trackEvent } from '@/lib/analytics';

export function BudrVideo() {
  const playTrackedRef = useRef(false);

  const handlePlay = () => {
    if (playTrackedRef.current) return;
    playTrackedRef.current = true;
    trackEvent('video_play');
  };

  return (
    <div className="budr-video">
      <div className="budr-video-frame">
        <video
          controls
          preload="none"
          playsInline
          poster="/video/budr-care-90-sek-poster.png"
          aria-label="BUDR Care på 90 sekunder: Lys til borgeren, Care Portal til personalet"
          onPlay={handlePlay}
        >
          <source src="/video/budr-care-90-sek.mp4" type="video/mp4" />
        </video>
      </div>
      <details className="budr-video-details">
        <summary>Læs hvad videoen viser</summary>
        <ul>
          <li>
            <strong>Lys (borgeren):</strong> dagligt check-in på 20 sekunder, refleksion med egen
            stemme, egne mål og næste skridt, personligt krisekort.
          </li>
          <li>
            <strong>Care Portal (personalet):</strong> hele mennesket på én skærm, journal skrevet
            af AI og godkendt af et menneske, recovery målt med CHIME, tidlige signaler, automatisk
            vagtoverdragelse.
          </li>
          <li>
            <strong>Kredsløbet:</strong> borgeren deler, AI skriver udkast, personalet ser, recovery
            vokser.
          </li>
          <li>Skærmbillederne viser eksempeldata.</li>
        </ul>
      </details>
    </div>
  );
}
