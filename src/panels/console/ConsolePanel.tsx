/**
 * ConsolePanel — diagnostic messages and editor log.
 *
 * Placeholder in v0.1. Shows two translated welcome lines.
 * Step 20 subscribes this panel to the log subsystem.
 */

import { useT } from '@core/i18n';

import styles from './ConsolePanel.module.css';

interface ConsoleLine {
  readonly level: 'info' | 'warn' | 'error';
  readonly text: string;
}

export function ConsolePanel() {
  const t = useT();
  const lines: ReadonlyArray<ConsoleLine> = [
    { level: 'info', text: t('console.welcome') },
    { level: 'info', text: t('console.noDocument') },
  ];
  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {lines.map((line, i) => (
          <li key={i} className={styles.line} data-level={line.level}>
            <span className={styles.level}>{line.level}</span>
            <span className={styles.text}>{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
