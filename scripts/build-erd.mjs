#!/usr/bin/env node
/**
 * Draws the entity relationship diagram from database/schema.sql.
 *
 *   npm run build:erd   ->  public/erd.svg (shown on /admin/database)
 *                           docs/erd.svg   (embedded in docs/DATABASE.md)
 *
 * Columns, types and keys are read from the schema, so the picture cannot
 * drift from the tables. Placement and line routes are fixed below (eight
 * tables do not need an automatic layout). Crow's foot notation: a bar is
 * "one", a circle is "zero", three prongs are "many".
 */

import { readFile, writeFile } from 'node:fs/promises';

const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Read the tables.
// ---------------------------------------------------------------------------
function readTable(name) {
  const block = new RegExp(String.raw`CREATE TABLE ${name} \(([\s\S]*?)\n\) ENGINE`).exec(schema)?.[1];
  if (!block) throw new Error(`no table ${name} in schema.sql`);
  const columns = [];
  for (const m of block.matchAll(/^ {2}([a-z_]+)\s+([A-Z]+(?:\s*\([^)]*\))?)/gm)) {
    columns.push({ name: m[1], type: m[2].replace(/\s+/g, '').replace(/^ENUM\(.*\)$/, 'ENUM') });
  }
  const pk = /PRIMARY KEY \((\w+)\)/.exec(block)?.[1];
  const fks = new Set([...block.matchAll(/FOREIGN KEY \((\w+)\)/g)].map((m) => m[1]));
  const uniques = new Set([...block.matchAll(/UNIQUE KEY \w+ \((\w+)\)/g)].map((m) => m[1]));
  return {
    name,
    columns: columns.map((c) => ({
      ...c,
      key: c.name === pk ? 'PK' : fks.has(c.name) ? (uniques.has(c.name) ? 'FK UQ' : 'FK') : uniques.has(c.name) ? 'UQ' : '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Layout. Four columns, two rows; routes run through the gaps.
// ---------------------------------------------------------------------------
const W = 300;
const HEAD = 34;
const ROW = 20;
const PAD = 8;
const COL = [30, 400, 770, 1140];
const ROW1 = 30;
const ROW2 = 480;

const place = {
  users: [COL[0], ROW1],
  refresh_tokens: [COL[0], ROW2 + 60],
  bookings: [COL[1], ROW1],
  booking_status_log: [COL[1], ROW2 + 40],
  cars: [COL[2], ROW1],
  payments: [COL[2], ROW2 + 40],
  branches: [COL[3], ROW1],
  deliveries: [COL[3], ROW2],
};

const tables = Object.fromEntries(
  Object.keys(place).map((name) => {
    const t = readTable(name);
    const [x, y] = place[name];
    return [name, { ...t, x, y, h: HEAD + PAD + t.columns.length * ROW + PAD }];
  }),
);

const box = (n) => tables[n];
const right = (n) => box(n).x + W;
const bottom = (n) => box(n).y + box(n).h;
const rowY = (n, column) => {
  const i = box(n).columns.findIndex((c) => c.name === column);
  return box(n).y + HEAD + PAD + i * ROW + ROW / 2 + 1;
};

// Each relationship: the "one" end first, the "many" end last, a polyline
// between, and the cardinality at each end.
const links = [
  { label: 'places', from: 'users', to: 'bookings', one: 'one', many: 'many', labelAt: [365, 70],
    points: [[right('users'), rowY('users', 'id')], [350, rowY('users', 'id')], [350, rowY('bookings', 'user_id')], [box('bookings').x, rowY('bookings', 'user_id')]] },
  { label: 'holds', from: 'users', to: 'refresh_tokens', one: 'one', many: 'many',
    points: [[COL[0] + 150, bottom('users')], [COL[0] + 150, box('refresh_tokens').y]] },
  { label: 'acted in', from: 'users', to: 'booking_status_log', one: 'zero-one', many: 'many',
    points: [[right('users'), rowY('users', 'role')], [365, rowY('users', 'role')], [365, rowY('booking_status_log', 'actor_user_id')], [box('booking_status_log').x, rowY('booking_status_log', 'actor_user_id')]] },
  { label: 'logs', from: 'bookings', to: 'booking_status_log', one: 'one', many: 'many',
    points: [[COL[1] + 110, bottom('bookings')], [COL[1] + 110, box('booking_status_log').y]] },
  { label: 'is booked in', from: 'cars', to: 'bookings', one: 'one', many: 'many', labelAt: [735, 70],
    points: [[box('cars').x, rowY('cars', 'id')], [735, rowY('cars', 'id')], [735, rowY('bookings', 'car_id')], [right('bookings'), rowY('bookings', 'car_id')]] },
  { label: 'houses', from: 'branches', to: 'cars', one: 'one', many: 'many', labelAt: [1105, 70],
    points: [[box('branches').x, rowY('branches', 'id')], [1105, rowY('branches', 'id')], [1105, rowY('cars', 'branch_id')], [right('cars'), rowY('cars', 'branch_id')]] },
  { label: 'paid by', from: 'bookings', to: 'payments', one: 'one', many: 'many',
    points: [[COL[1] + 230, bottom('bookings')], [COL[1] + 230, 452], [COL[2] + 150, 452], [COL[2] + 150, box('payments').y]] },
  { label: 'has one', from: 'bookings', to: 'deliveries', one: 'one', many: 'one',
    points: [[COL[1] + 270, bottom('bookings')], [COL[1] + 270, 432], [1105, 432], [1105, rowY('deliveries', 'booking_id')], [box('deliveries').x, rowY('deliveries', 'booking_id')]] },
  { label: 'collection point of', from: 'branches', to: 'deliveries', one: 'zero-one', many: 'many',
    points: [[COL[3] + 200, bottom('branches')], [COL[3] + 200, box('deliveries').y]] },
];

// ---------------------------------------------------------------------------
// Draw.
// ---------------------------------------------------------------------------
const INK = '#1A1A1A';
const MUTED = '#6C6863';
const CARMINE = '#A82519';
const GROUND = '#F9F8F6';
const FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Cascadia Mono', Consolas, 'SF Mono', Menlo, monospace";

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function drawTable(t) {
  const out = [];
  out.push(`<g>`);
  out.push(`<rect x="${t.x}" y="${t.y}" width="${W}" height="${t.h}" fill="#FFFFFF" stroke="${INK}" stroke-width="1.25"/>`);
  out.push(`<rect x="${t.x}" y="${t.y}" width="${W}" height="${HEAD}" fill="${CARMINE}"/>`);
  out.push(`<text x="${t.x + 12}" y="${t.y + 22}" font-family="${FONT}" font-size="15" font-weight="600" fill="#FFFFFF">${esc(t.name)}</text>`);
  t.columns.forEach((c, i) => {
    const y = t.y + HEAD + PAD + i * ROW + 14;
    const pk = c.key === 'PK';
    const fk = c.key.startsWith('FK');
    out.push(`<text x="${t.x + 12}" y="${y}" font-family="${MONO}" font-size="12" fill="${fk ? CARMINE : INK}"${pk ? ' text-decoration="underline" font-weight="700"' : ''}>${esc(c.name)}</text>`);
    out.push(`<text x="${t.x + 182}" y="${y}" font-family="${MONO}" font-size="10.5" fill="${MUTED}">${esc(c.type)}</text>`);
    if (c.key) out.push(`<text x="${t.x + W - 10}" y="${y}" text-anchor="end" font-family="${FONT}" font-size="9.5" font-weight="700" fill="${fk ? CARMINE : INK}">${c.key}</text>`);
  });
  out.push(`</g>`);
  return out.join('\n');
}

/** The marks at one end of a line, drawn looking along the last segment. */
function endMarks([x, y], [px, py], kind) {
  const dx = Math.sign(x - px);
  const dy = Math.sign(y - py);
  // Unit vector pointing into the box, and its perpendicular.
  const along = (d) => [x - dx * d, y - dy * d];
  const perp = (p, d) => [p[0] + dy * d, p[1] + dx * d];
  const line = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${INK}" stroke-width="1.25"/>`;
  const bar = (d) => line(perp(along(d), -7), perp(along(d), 7));
  const circle = (d) => {
    const [cx, cy] = along(d);
    return `<circle cx="${cx}" cy="${cy}" r="5" fill="${GROUND}" stroke="${INK}" stroke-width="1.25"/>`;
  };
  const crow = () => {
    const base = along(14);
    return [line(base, perp([x, y], -8)), line(base, [x, y]), line(base, perp([x, y], 8))].join('');
  };
  switch (kind) {
    case 'one': return bar(8) + bar(14);
    case 'zero-one': return bar(8) + circle(20);
    case 'many': return crow() + circle(22);
    default: return '';
  }
}

function drawLink(l) {
  const pts = l.points;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const out = [`<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.25"/>`];
  out.push(endMarks(pts[0], pts[1], l.one));
  out.push(endMarks(pts.at(-1), pts.at(-2), l.many));
  if (l.labelAt) {
    const [lx, ly] = l.labelAt;
    out.push(`<text x="${lx}" y="${ly}" text-anchor="middle" font-family="${FONT}" font-size="11" font-style="italic" fill="${MUTED}">${esc(l.label)}</text>`);
    return out.join('\n');
  }
  // Label on the longest segment, a little off the line.
  let best = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const prev = Math.hypot(pts[best + 1]?.[0] - pts[best][0], pts[best + 1]?.[1] - pts[best][1]) || 0;
    if (len > prev) best = i - 1;
  }
  const [ax, ay] = pts[best];
  const [bx, by] = pts[best + 1];
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const vertical = ax === bx;
  out.push(
    `<text x="${vertical ? mx + 8 : mx}" y="${vertical ? my : my - 7}" ${vertical ? '' : 'text-anchor="middle" '}font-family="${FONT}" font-size="11" font-style="italic" fill="${MUTED}">${esc(l.label)}</text>`,
  );
  return out.join('\n');
}

const width = COL[3] + W + 30;
const height = Math.max(...Object.values(tables).map((t) => t.y + t.h)) + 60;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="erd-title erd-desc">
<title id="erd-title">D4Drive entity relationship diagram</title>
<desc id="erd-desc">Eight tables. users places bookings, holds refresh_tokens, and acts in booking_status_log. branches houses cars and is the collection point of deliveries. cars is booked in bookings. bookings has one delivery, is paid by payments, and logs booking_status_log.</desc>
<rect width="100%" height="100%" fill="${GROUND}"/>
${links.map(drawLink).join('\n')}
${Object.values(tables).map(drawTable).join('\n')}
<text x="30" y="${height - 22}" font-family="${FONT}" font-size="11" fill="${MUTED}">PK primary key, FK foreign key (carmine), UQ unique. Bar: one. Circle: zero. Three prongs: many. Generated from database/schema.sql by npm run build:erd.</text>
</svg>
`;

for (const target of ['../public/erd.svg', '../docs/erd.svg']) {
  await writeFile(new URL(target, import.meta.url), svg);
}
console.log(`ERD written: ${Object.keys(tables).length} tables, ${links.length} relationships, ${width}x${height}.`);
