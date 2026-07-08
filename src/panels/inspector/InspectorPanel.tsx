/**
 * InspectorPanel — schema-driven property editor for the current selection.
 *
 * Placeholder in v0.1. Field renderers are registered through the
 * Extension Registry in later steps.
 */

import { useT } from '@core/i18n';

import styles from './InspectorPanel.module.css';

export function InspectorPanel() {
  const t = useT();
  return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{t('inspector.empty.title')}</p>
        <p className={styles.emptyHint}>{t('inspector.empty.hint')}</p>
      </div>
    </div>
  );
}
