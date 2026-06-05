import { getDatabase } from './database';

export const syncWhitelist = (wallets) => {
  const db = getDatabase();
  db.runSync('DELETE FROM whitelist;');
  const stmt = db.prepareSync(
    'INSERT OR REPLACE INTO whitelist (id, address, label, registered) VALUES (?,?,?,?);'
  );
  try {
    for (const w of wallets) {
      stmt.executeSync([w.id, w.address, w.label, w.registered]);
    }
  } finally { stmt.finalizeSync(); }
};

export const getWhitelist = () => {
  const db = getDatabase();
  return db.getAllSync('SELECT * FROM whitelist ORDER BY label ASC;');
};

export const getWhitelistByAddress = (address) => {
  const db = getDatabase();
  return db.getFirstSync(
    'SELECT * FROM whitelist WHERE LOWER(address) = LOWER(?);', [address]
  ) || null;
};

export const countWhitelist = () => {
  const db = getDatabase();
  return db.getFirstSync('SELECT COUNT(*) as total FROM whitelist;')?.total ?? 0;
};
