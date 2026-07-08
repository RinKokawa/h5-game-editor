/**
 * InspectorPanel — schema-driven property editor for the current selection.
 *
 * Placeholder in v0.1. Field renderers are registered through the
 * Extension Registry in later steps.
 */

import styles from './InspectorPanel.module.css';

export function InspectorPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No selection</p>
        <p className={styles.emptyHint}>
          Select a tile, entity, or collider to inspect its properties.
        </p>
      </div>
    </div>
  );
}
