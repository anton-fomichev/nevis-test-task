import { useMemo } from 'react';

import { Card, ErrorState, Spinner } from '../../../shared/ui';
import { useClientsReport, type UseClientsReportOptions } from '../api';
import { normaliseCompany, toChartSeries } from '../model';
import styles from './ClientsDashboard.module.css';
import { StackedBarChart } from './StackedBarChart';
import { TreeTable } from './TreeTable';

export type ClientsDashboardProps = UseClientsReportOptions;

const CHART_LABEL = 'Stacked bar chart of clients per month by branch';
const TABLE_LABEL = 'Clients per month by branch, adviser and acquisition channel';

/**
 * The feature: fetches the report and composes chart + table. Loading shows spinners in
 * same-sized card placeholders; failure shows the message and a Retry that refetches.
 */
export function ClientsDashboard({ search }: ClientsDashboardProps = {}) {
  const query = useClientsReport({ search });

  const view = useMemo(() => {
    if (!query.data) return null;
    const root = normaliseCompany(query.data.company);
    return { root, series: toChartSeries(root), months: query.data.months };
  }, [query.data]);

  if (query.isPending) {
    return (
      <>
        <Card
          className={`${styles.chartCard} ${styles.placeholder} ${styles.chartPlaceholder}`}
          aria-busy="true"
        >
          <Spinner label="Loading the clients report…" />
        </Card>
        <Card className={`${styles.placeholder} ${styles.tablePlaceholder}`} aria-busy="true">
          <Spinner />
        </Card>
      </>
    );
  }

  if (query.isError || !view) {
    return (
      <Card>
        <ErrorState
          title="The clients report could not be loaded."
          message={query.error?.message ?? 'Unknown error.'}
          onRetry={query.retry}
          retrying={query.isFetching}
        />
      </Card>
    );
  }

  return (
    <>
      <Card className={styles.chartCard} aria-label="Clients chart">
        <StackedBarChart series={view.series} months={view.months} label={CHART_LABEL} />
      </Card>
      <Card aria-label="Clients table">
        <TreeTable root={view.root} months={view.months} label={TABLE_LABEL} />
      </Card>
    </>
  );
}
