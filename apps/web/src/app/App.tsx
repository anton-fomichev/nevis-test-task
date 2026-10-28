import { normaliseCompany, toChartSeries } from '../features/clients/model';
import { StackedBarChart, TreeTable } from '../features/clients/ui';
import { Card } from '../shared/ui';
import { company, MONTHS } from '../test/fixtures';
import { QueryProvider } from './QueryProvider';
import styles from './App.module.css';

// TEMPORARY (step 6 preview only): replaced by the data-fetching dashboard in step 8.
const root = normaliseCompany(company);
const series = toChartSeries(root);

/** Root of the single-page dashboard: title + the clients feature. */
export function App() {
  return (
    <QueryProvider>
      <main className={styles.page}>
        <h1 className={styles.title}>Clients</h1>
        <Card style={{ padding: '24px 16px 16px' }}>
          <StackedBarChart series={series} months={MONTHS} label="Clients per month by branch" />
        </Card>
        <Card>
          <TreeTable root={root} months={MONTHS} label="Clients by branch, adviser and channel" />
        </Card>
      </main>
    </QueryProvider>
  );
}
