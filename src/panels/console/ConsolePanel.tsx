/**
 * ConsolePanel — diagnostic messages and editor log.
 *
 * Reads from `useConsoleStore`. The store is populated by `EditorShell`,
 * which subscribes to `subscribeLog` on mount. Initial welcome lines
 * are pushed once on the EditorShell side so the wiring is in one
 * place.
 *
 * No business logic here — this is a pure readout.
 */

import { useConsoleStore } from '@state/consoleStore';

import styles from './ConsolePanel.module.css';

export function ConsolePanel() {
  const lines = useConsoleStore((s) => s.lines);
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
