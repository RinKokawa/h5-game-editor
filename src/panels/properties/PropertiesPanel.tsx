/**
 * PropertiesPanel — flat key/value view of the current selection.
 *
 * Distinct from the Inspector: Inspector is schema-driven with field
 * renderers; Properties is a generic fallback for plugin authors and
 * debugging.
 */

import styles from './PropertiesPanel.module.css';

const PLACEHOLDER_ROWS: ReadonlyArray<readonly [string, string]> = [
  ['id', '—'],
  ['type', '—'],
  ['position', '—'],
  ['size', '—'],
  ['rotation', '—'],
];

export function PropertiesPanel() {
  return (
    <div className={styles.panel}>
      <table className={styles.table}>
        <tbody>
          {PLACEHOLDER_ROWS.map(([key, value]) => (
            <tr key={key} className={styles.row}>
              <th className={styles.key}>{key}</th>
              <td className={styles.value}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
