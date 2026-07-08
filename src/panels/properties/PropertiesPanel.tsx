/**
 * PropertiesPanel — flat key/value view of the current selection.
 *
 * Distinct from the Inspector: Inspector is schema-driven with field
 * renderers; Properties is a generic fallback for plugin authors and
 * debugging.
 *
 * v0.1 placeholder: shows hardcoded rows so the layout is stable.
 * Step 19 replaces these with selection-driven data.
 */

import { useT } from '@core/i18n';

import styles from './PropertiesPanel.module.css';

const PLACEHOLDER_ROWS: ReadonlyArray<string> = [
  'properties.id',
  'properties.type',
  'properties.position',
  'properties.size',
  'properties.rotation',
];

export function PropertiesPanel() {
  const t = useT();
  return (
    <div className={styles.panel}>
      <table className={styles.table}>
        <tbody>
          {PLACEHOLDER_ROWS.map((labelKey) => (
            <tr key={labelKey} className={styles.row}>
              <th className={styles.key}>{t(labelKey)}</th>
              <td className={styles.value}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
