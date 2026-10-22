import { describe, expect, it } from 'vitest';
import { buildJournalPolishRequest } from './polishPrompt';

describe('buildJournalPolishRequest', () => {
  it('sender kun initialer til AI, også når klienten sender navnet', () => {
    const r = buildJournalPolishRequest({
      draft: 'Kasper Brix Juhl var glad i dag. Kasper spillede fodbold.',
      residentLabel: 'Kasper Brix Juhl',
    });
    expect(r.userMessage).toContain('Beboer (kun kontekst): KBJ');
    expect(r.userMessage).toContain('KBJ var glad i dag. KBJ spillede fodbold.');
    expect(r.userMessage).not.toMatch(/Kasper/);
  });
});
