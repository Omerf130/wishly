/** Linked transactions only — orphan rows are excluded by INNER JOIN. */
export const BACKUP_SAVINGS_TRANSACTIONS_SQL = `SELECT st.*
FROM savings_transactions st
INNER JOIN dreams d ON d.id = st.dream_id
ORDER BY st.id ASC`;

export const BACKUP_DREAMS_SQL = `SELECT * FROM dreams ORDER BY id ASC`;
