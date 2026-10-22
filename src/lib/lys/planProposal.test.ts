import { describe, expect, it } from 'vitest';
import { laasMedicin, type PlanItem } from './planProposal';

const med: PlanItem = { id: 'm1', time: '08:00', title: 'Morgenmedicin', category: 'medicin' };
const gaa: PlanItem = { id: 'a1', time: '10:00', title: 'Gåtur', category: 'aktivitet' };

describe('laasMedicin', () => {
  it('genindsætter medicin, som AI-forslaget har fjernet', () => {
    expect(laasMedicin([med, gaa], [gaa])).toEqual([med, gaa]);
  });

  it('ignorerer medicin, som AI-forslaget har flyttet eller tilføjet', () => {
    const flyttet = { ...med, time: '11:00' };
    const ny: PlanItem = { id: 'm2', time: '12:00', title: 'Ekstra pille', category: 'medicin' };
    expect(laasMedicin([med, gaa], [flyttet, ny, gaa])).toEqual([med, gaa]);
  });
});
