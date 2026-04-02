export interface MedDefinition {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  time_label: string;
  time_group: 'morgen' | 'middag' | 'aften' | 'behoev';
  prescribed_by: string;
  notes: string | null;
  status: 'aktiv' | 'pauseret' | 'stoppet';
}
