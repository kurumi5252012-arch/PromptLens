import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function createStore(path = "data/promptlens.sqlite") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, body TEXT NOT NULL)",
  );
  return {
    save(run) {
      db.prepare(
        "INSERT INTO runs (id, created_at, body) VALUES (?, ?, ?)",
      ).run(run.id, run.createdAt, JSON.stringify(run));
      db.exec(
        "DELETE FROM runs WHERE id NOT IN (SELECT id FROM runs ORDER BY created_at DESC LIMIT 50)",
      );
    },
    list() {
      return db
        .prepare("SELECT body FROM runs ORDER BY created_at DESC")
        .all()
        .map((row) => {
          const { id, name, mode, createdAt, cases } = JSON.parse(row.body);
          return { id, name, mode, createdAt, caseCount: cases.length };
        });
    },
    get(id) {
      const row = db.prepare("SELECT body FROM runs WHERE id = ?").get(id);
      return row ? JSON.parse(row.body) : null;
    },
    close() {
      db.close();
    },
  };
}
