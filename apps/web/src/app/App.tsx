import { ClientsDashboard } from '../features/clients/ui';
import { QueryProvider } from './QueryProvider';
import styles from './App.module.css';

/** Root of the single-page dashboard: title + the clients feature. */
export function App() {
  return (
    <QueryProvider>
      <main className={styles.page}>
        <h1 className={styles.title}>Clients</h1>
        <ClientsDashboard />
      </main>
    </QueryProvider>
  );
}
