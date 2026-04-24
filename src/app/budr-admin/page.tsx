import BudrAdminClient from './BudrAdminClient';
import { getBudrAdminOverview } from './adminOverview';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseHealthFilter(
  value: string | string[] | undefined
): 'all' | 'critical' | 'warning' | 'healthy' {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'critical' || raw === 'warning' || raw === 'healthy' || raw === 'all') return raw;
  return 'all';
}

export default async function BudrAdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialHealthFilter = parseHealthFilter(resolvedSearchParams.health);
  const { rows, incompleteUsers, orgOptions, roleOptions, error } = await getBudrAdminOverview();
  return (
    <BudrAdminClient
      overviewRows={rows}
      incompleteUsers={incompleteUsers}
      orgOptions={orgOptions}
      roleOptions={roleOptions}
      overviewError={error}
      initialHealthFilter={initialHealthFilter}
    />
  );
}
