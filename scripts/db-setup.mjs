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
 * constructs used in our own schema and seed files; it is not a general SQL
 * parser and should not be pointed at arbitrary scripts.
 */
function splitStatements(sql) {
  const withoutComments = sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  const statements = [];
  let current = '';
  let inString = null;

  for (let i = 0; i < withoutComments.length; i += 1) {
    const ch = withoutComments[i];
    const prev = withoutComments[i - 1];

    if (inString) {
      if (ch === inString && prev !== '\') inString = null;
    } else if (ch === "'" || ch === '"') {
      inString = ch;
    } else if (ch === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
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

  for (const file of ['database/schema.sql', 'database/seed.sql']) {
    process.stdout.write(`Loading ${file} `);
    const statements = splitStatements(await readFile(file, 'utf8'));
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`(${statements.length} statements)`);
  }

  const [[counts]] = await connection.query(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM branches) AS branches,
            (SELECT COUNT(*) FROM cars) AS cars`,
  );

  console.log(
    `\nReady. ${counts.users} users, ${counts.branches} branches, ${counts.cars} cars.\n`,
  );

  await connection.end();
}

main().catch((error) => {
  console.error('\nSetup failed:', error.message, '\n');
  process.exit(1);
});
