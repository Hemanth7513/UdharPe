const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Escapes a single CSV cell and neutralizes spreadsheet formula injection.
 */
function sanitizeCsvCell(value) {
  const raw = String(value ?? '');
  const safe = FORMULA_PREFIX_RE.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Generates and triggers a UTF-8 BOM CSV download with formula-injection protection.
 */
export function exportCsv(filename, headers, rows) {
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map((row) => row.map(sanitizeCsvCell).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
