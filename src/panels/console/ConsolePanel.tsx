/**
 * ConsolePanel — diagnostic messages and editor log.
 *
 * Placeholder in v0.1. Future versions subscribe to the diagnostics
 * subsystem and render colored, filterable output.
 */

import styles from './ConsolePanel.module.css';

interface ConsoleLine {
  readonly level: 'info' | 'warn' | 'error';
  readonly text: string;
}

const MOCK: readonly ConsoleLine[] = [
  { level: 'info', text: 'H5 Game Editor started.' },
  { level: 'info', text: 'No document loaded — File ▸ New to create one.' },
];

export function ConsolePanel() {
  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {MOCK.map((line, i) => (
          <li key={i} className={styles.line} data-level={line.level}>
            <span className={styles.level}>{line.level}</span>
            <span className={styles.text}>{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
