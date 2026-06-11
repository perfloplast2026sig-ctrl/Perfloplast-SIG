type ExcelCellValue = string | number | Date | null | undefined;

export type ExcelCell = ExcelCellValue | {
  value?: ExcelCellValue;
  style?: string;
  type?: "String" | "Number" | "DateTime";
  mergeAcross?: number;
};

export type ExcelRow = {
  cells: ExcelCell[];
  height?: number;
};

export type ExcelWorksheet = {
  name: string;
  columns?: number[];
  rows: ExcelRow[];
  freezeHeader?: boolean;
};

type NormalizedExcelCell = {
  value?: ExcelCellValue;
  style?: string;
  type?: "String" | "Number" | "DateTime";
  mergeAcross?: number;
};

export function downloadExcelWorkbook(fileName: string, worksheets: ExcelWorksheet[]) {
  const workbook = buildWorkbookXml(worksheets);
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xls") ? fileName : `${fileName}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export function excelCell(value: ExcelCellValue, style = "Text", type?: "String" | "Number" | "DateTime", mergeAcross?: number): ExcelCell {
  return { value, style, type, mergeAcross };
}

function buildWorkbookXml(worksheets: ExcelWorksheet[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>Perfloplast SIG</Author></DocumentProperties>
  <Styles>${stylesXml()}</Styles>
  ${worksheets.map(worksheetXml).join("\n")}
</Workbook>`;
}

function worksheetXml(worksheet: ExcelWorksheet) {
  return `<Worksheet ss:Name="${escapeXml(safeSheetName(worksheet.name))}">
    <Table>
      ${(worksheet.columns || []).map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join("\n")}
      ${worksheet.rows.map(rowXml).join("\n")}
    </Table>
    ${worksheet.freezeHeader ? `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions>` : ""}
  </Worksheet>`;
}

function rowXml(row: ExcelRow) {
  const height = row.height ? ` ss:Height="${row.height}"` : "";
  return `<Row${height}>${row.cells.map(cellXml).join("")}</Row>`;
}

function cellXml(cell: ExcelCell) {
  const normalized = normalizeCell(cell);
  const value = normalized.value ?? "";
  const type = normalized.type || (typeof value === "number" ? "Number" : value instanceof Date ? "DateTime" : "String");
  const merge = normalized.mergeAcross ? ` ss:MergeAcross="${normalized.mergeAcross}"` : "";
  const style = normalized.style ? ` ss:StyleID="${normalized.style}"` : "";
  const data = type === "Number" ? String(Number(value || 0)) : value instanceof Date ? value.toISOString() : escapeXml(String(value));
  return `<Cell${style}${merge}><Data ss:Type="${type}">${data}</Data></Cell>`;
}

function normalizeCell(cell: ExcelCell): NormalizedExcelCell {
  if (cell && typeof cell === "object" && !(cell instanceof Date) && ("value" in cell || "style" in cell || "type" in cell || "mergeAcross" in cell)) return cell;
  return { value: cell as ExcelCellValue, style: "Text" };
}

function stylesXml() {
  return `
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos Narrow" ss:Size="10"/></Style>
    <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Aptos Narrow" ss:Size="18" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#003B8F" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Subtitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Aptos Narrow" ss:Size="10" ss:Bold="1" ss:Color="#DCEBFF"/><Interior ss:Color="#003B8F" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Section"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Font ss:FontName="Aptos Narrow" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F766E" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10" ss:Bold="1" ss:Color="#06184A"/><Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Text"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10"/></Style>
    <Style ss:ID="Muted"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="9" ss:Color="#64748B"/></Style>
    <Style ss:ID="Label"><Alignment ss:Vertical="Center"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10" ss:Bold="1" ss:Color="#003B8F"/><Interior ss:Color="#F7FAFF" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Number"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10"/><NumberFormat ss:Format="#,##0"/></Style>
    <Style ss:ID="Money"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10"/><NumberFormat ss:Format='&quot;Q&quot; #,##0.00'/></Style>
    <Style ss:ID="Percent"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10"/><NumberFormat ss:Format="0.00%"/></Style>
    <Style ss:ID="Total"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders>${borderXml()}</Borders><Font ss:FontName="Aptos Narrow" ss:Size="10" ss:Bold="1" ss:Color="#06184A"/><Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/><NumberFormat ss:Format='&quot;Q&quot; #,##0.00'/></Style>`;
}

function borderXml() {
  return `<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D7E1F2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D7E1F2"/>`;
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Hoja";
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
