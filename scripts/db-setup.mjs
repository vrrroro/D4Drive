#!/usr/bin/env node
/**
 * Creates the database, loads the schema, and seeds it.
 *
 * Uses the mysql2 driver rather than shelling out to the `mysql` client, which
 * is not on PATH in a default Windows MySQL install.
 */

import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

function loadEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Splits a script into statements.
 *
 * multipleStatements stays off on the pool for safety, so the script is split
 * here instead. This is a deliberately simple splitter that handles the
 * constructs used in our own files; it is not a general SQL parser and should
 * not be pointed at arbitrary scripts.
 *
 * It understands the mysql client's `DELIMITER` directive, so routines.sql
 * (procedure and trigger bodies full of semicolons) loads the same way here
 * as it does through `mysql < database/routines.sql`. Whole-line `--`
 * comments are dropped; quotes are tracked so a delimiter inside a string
 * does not end a statement.
 */
function splitStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let current = '';
  let inString = null;

  for (const line of sql.split(/\r?\n/)) {
    if (!inString) {
      if (line.trimStart().startsWith('--')) continue;
      const directive = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line);
      if (directive) {
        delimiter = directive[1];
        continue;
      }
    }

    const text = `${line}\n`;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (ch === inString && text[i - 1] !== '\\') inString = null;
        current += ch;
      } else if (ch === "'" || ch === '"') {
        inString = ch;
        current += ch;
      } else if (text.startsWith(delimiter, i)) {
        if (current.trim()) statements.push(current.trim());
        current = '';
        i += delimiter.length - 1;
      } else {
        current += ch;
      }
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  const env = loadEnv(await readFile('.env', 'utf8'));
  const database = env.DB_NAME ?? 'd4drive';

  const config = {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    multipleStatements: false,
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`\nMySQL refused the credentials in .env for user "${config.user}".`);
      console.error('The server is running; the username or password is wrong.');
      console.error('Fix DB_USER and DB_PASSWORD in .env, then run this again.\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`\nNo MySQL server at ${config.host}:${config.port}. Is it running?\n`);
    } else {
      console.error(`\n${error.message}\n`);
    }
    process.exit(1);
  }

  console.log(`Creating database ${database}`);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database });

  // Schema, then the stored programs, then the seed: the seed's status
  // changes rely on the triggers to write the booking history.
  for (const file of ['database/schema.sql', 'database/routines.sql', 'database/seed.sql']) {
    process.stdout.write(`Loading ${file} `);
    const statements = splitStatements(await readFile(file, 'utf8'));
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        console.error(`\n\nFailed in ${file}:\n${statement.slice(0, 400)}\n`);
        throw error;
      }
    }
    console.log(`(${statements.length} statements)`);
  }

  const tables = [
    'users', 'branches', 'cars', 'bookings', 'deliveries', 'payments',
    'refresh_tokens', 'booking_status_log',
  ];
  const [[counts]] = await connection.query(
    `SELECT ${tables.map((t) => `(SELECT COUNT(*) FROM ${t}) AS ${t}`).join(', ')}`,
  );
  const [routines] = await connection.query(
    `SELECT ROUTINE_TYPE AS type, COUNT(*) AS n FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE() GROUP BY ROUTINE_TYPE`,
  );
  const [[triggers]] = await connection.query(
    'SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()',
  );

  console.log('\nReady.');
  for (const t of tables) console.log(`  ${t.padEnd(20)} ${counts[t]} rows`);
  for (const r of routines) console.log(`  ${`${r.type.toLowerCase()}s`.padEnd(20)} ${r.n}`);
  console.log(`  ${'triggers'.padEnd(20)} ${triggers.n}\n`);

  await connection.end();
}

main().catch((error) => {
  console.error('\nSetup failed:', error.message, '\n');
  process.exit(1);
});
