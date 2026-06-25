import fs from 'fs';
import { TextDecoder } from 'util';

export type CsvRow = Record<string, string>;

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
};

export async function readCsv(filePath: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  const buffer = await fs.promises.readFile(filePath);
  const content = new TextDecoder('euc-kr').decode(buffer);
  const lines = content.split(/\r?\n/);

  let headers: string[] | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells = parseCsvLine(line);
    if (!headers) {
      headers = cells.map((cell) => cell.trim());
      continue;
    }

    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}
