/**
 * Excel and CSV Export & Import Helper
 * Supports generating professional formatted Excel sheets (.xlsx) and CSV files (.csv),
 * downloading sample templates, and parsing uploaded files in the browser using ExcelJS.
 */

let _excelJsPromise = null;
export async function getExcelJS() {
  if (!_excelJsPromise) {
    _excelJsPromise = import("exceljs").then((m) => m.default || m);
  }
  return _excelJsPromise;
}

/**
 * Downloads an ExcelJS workbook as .xlsx
 */
export async function downloadExcelWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads text as a .csv file (with UTF-8 BOM for Excel compatibility)
 */
export function downloadCsv(csvContent, filename) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts array of rows (arrays of cells) to standard escaped CSV string
 */
export function convertRowsToCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell !== null && cell !== undefined ? String(cell) : "";
          if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\r\n");
}

/**
 * Robust in-browser CSV parser that handles quoted strings with commas and newlines
 */
export function parseCsvText(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(currentVal.trim());
      if (row.some((c) => c !== "")) {
        lines.push(row);
      }
      row = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentVal !== "" || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some((c) => c !== "")) {
      lines.push(row);
    }
  }
  return lines;
}

/**
 * Parses either an .xlsx, .xls, or .csv file and returns an array of row objects
 * mapped by header column names.
 */
export async function parseFileToObjects(file) {
  const filename = file.name.toLowerCase();

  let rawRows = [];

  if (filename.endsWith(".csv")) {
    const text = await file.text();
    rawRows = parseCsvText(text);
  } else {
    // Treat as Excel (.xlsx / .xls)
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowValues = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let val = cell.value;
        if (val && typeof val === "object") {
          if (val.result !== undefined) val = val.result;
          else if (val.text !== undefined) val = val.text;
          else if (val instanceof Date) val = val.toISOString().split("T")[0];
        }
        rowValues[colNumber - 1] = val !== null && val !== undefined ? String(val).trim() : "";
      });
      if (rowValues.some((v) => v !== "")) {
        rawRows.push(rowValues);
      }
    });
  }

  if (rawRows.length < 2) {
    return [];
  }

  // First row is headers
  const headers = rawRows[0].map((h) => String(h || "").trim());
  const dataRows = rawRows.slice(1);

  return dataRows.map((r, rowIndex) => {
    const obj = { _rowIndex: rowIndex + 2 };
    headers.forEach((header, colIdx) => {
      if (header) {
        obj[header] = r[colIdx] !== undefined ? r[colIdx] : "";
      }
    });
    return obj;
  });
}
