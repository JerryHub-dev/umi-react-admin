/** Validate the archive and XML before ExcelJS creates worksheet objects. */
export const XLSX_LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  expandedBytes: 16 * 1024 * 1024,
  entryBytes: 8 * 1024 * 1024,
  entries: 256,
  sheets: 16,
  rows: 1001, // Header plus 1000 data rows.
  columns: 64,
  cells: 64_064,
  textCharacters: 4096,
  xmlNodes: 200_000,
  timeoutMs: 10_000,
} as const;

export type ImportErrorCode =
  | 'parseFailed'
  | 'fileLimit'
  | 'archiveLimit'
  | 'sheetLimit'
  | 'textLimit'
  | 'unsupported'
  | 'timeout'
  | 'cancelled'
  | 'noSheet';

export class WorkbookInputError extends Error {
  constructor(public readonly code: ImportErrorCode) {
    super(code);
    this.name = 'WorkbookInputError';
  }
}

type ArchiveLimits = Record<'fileBytes' | 'expandedBytes' | 'entryBytes' | 'entries', number>;
type Entry = {
  name: string;
  start: number;
  end: number;
  compressed: number;
  expanded: number;
  crc: number;
  method: number;
};

function fail(code: ImportErrorCode = 'parseFailed'): never {
  throw new WorkbookInputError(code);
}

export const checkWorkbookFileSize = (size: number) => {
  if (!Number.isSafeInteger(size) || size <= 0) fail();
  if (size > XLSX_LIMITS.fileBytes) fail('fileLimit');
};

const bytesEqual = (left: Uint8Array, right: Uint8Array) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const checkExtra = (view: DataView, start: number, length: number) => {
  const end = start + length;
  let cursor = start;
  while (cursor < end) {
    if (cursor + 4 > end) fail();
    const tag = view.getUint16(cursor, true);
    const size = view.getUint16(cursor + 2, true);
    // ZIP64 and Unicode path aliases can change what a second parser reads.
    if (tag === 0x0001 || tag === 0x7075) fail('unsupported');
    cursor += 4 + size;
    if (cursor > end) fail();
  }
};

const readEntries = (buffer: ArrayBuffer, limits: ArchiveLimits): Entry[] => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes.length < 22 || bytes.length > limits.fileBytes) fail('fileLimit');
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset--) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === bytes.length
    ) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) fail();
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralStart = view.getUint32(eocd + 16, true);
  if (view.getUint16(eocd + 4, true) || view.getUint16(eocd + 6, true) || view.getUint16(eocd + 8, true) !== count) {
    fail('unsupported');
  }
  if (count === 0xffff || centralSize === 0xffffffff || centralStart === 0xffffffff) fail('unsupported');
  if (!count || count > limits.entries) fail('archiveLimit');
  if (centralStart + centralSize !== eocd) fail();
  const entries: Entry[] = [];
  const names = new Set<string>();
  const ranges: { start: number; end: number }[] = [];
  let cursor = centralStart;
  let declaredBytes = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > eocd || view.getUint32(cursor, true) !== 0x02014b50) fail();
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const crc = view.getUint32(cursor + 16, true);
    const compressed = view.getUint32(cursor + 20, true);
    const expanded = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const local = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > eocd || !nameLength || compressed === 0xffffffff || expanded === 0xffffffff || local === 0xffffffff)
      fail();
    if (view.getUint16(cursor + 34, true) || flags & 0x2041 || (method !== 0 && method !== 8)) fail('unsupported');
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    // OOXML package part names are ASCII; reject ambiguous path encodings.
    if (nameBytes.some((value) => value < 0x20 || value > 0x7e)) fail('unsupported');
    const name = new TextDecoder().decode(nameBytes);
    const parts = name.replace(/\/$/, '').split('/');
    if (
      name.startsWith('/') ||
      name.includes('\\') ||
      parts.some((part) => !part || part === '.' || part === '..') ||
      names.has(name)
    )
      fail();
    names.add(name);
    checkExtra(view, cursor + 46 + nameLength, extraLength);
    if (local + 30 > centralStart || view.getUint32(local, true) !== 0x04034b50) fail();
    if (view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) fail();
    const localNameLength = view.getUint16(local + 26, true);
    const localExtraLength = view.getUint16(local + 28, true);
    const start = local + 30 + localNameLength + localExtraLength;
    const end = start + compressed;
    if (
      start > centralStart ||
      end > centralStart ||
      !bytesEqual(nameBytes, bytes.subarray(local + 30, local + 30 + localNameLength))
    )
      fail();
    checkExtra(view, local + 30 + localNameLength, localExtraLength);
    const localCrc = view.getUint32(local + 14, true);
    const localCompressed = view.getUint32(local + 18, true);
    const localExpanded = view.getUint32(local + 22, true);
    let rangeEnd = end;
    if (flags & 8) {
      if (
        (localCrc && localCrc !== crc) ||
        (localCompressed && localCompressed !== compressed) ||
        (localExpanded && localExpanded !== expanded)
      )
        fail();
      // Accept both ordinary forms of the data descriptor (with/without signature).
      const candidates = [end, end + 4];
      const descriptor = candidates.find(
        (offset) =>
          offset + 12 <= centralStart &&
          (offset === end || view.getUint32(end, true) === 0x08074b50) &&
          view.getUint32(offset, true) === crc &&
          view.getUint32(offset + 4, true) === compressed &&
          view.getUint32(offset + 8, true) === expanded,
      );
      if (descriptor === undefined) fail();
      rangeEnd = descriptor + 12;
    } else if (localCrc !== crc || localCompressed !== compressed || localExpanded !== expanded) {
      fail();
    }
    if (expanded > limits.entryBytes || declaredBytes + expanded > limits.expandedBytes) fail('archiveLimit');
    declaredBytes += expanded;
    if (method === 0 && compressed !== expanded) fail();
    ranges.push({ start: local, end: rangeEnd });
    entries.push({ name, start, end, compressed, expanded, crc, method });
    cursor = next;
  }
  if (cursor !== eocd) fail();
  ranges.sort((left, right) => left.start - right.start);
  if (ranges[0].start !== 0 || ranges.some((range, index) => index > 0 && range.start < ranges[index - 1].end)) fail();
  return entries;
};

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const updateCrc = (crc: number, bytes: Uint8Array) => {
  let next = crc;
  for (const value of bytes) next = crcTable[(next ^ value) & 255] ^ (next >>> 8);
  return next >>> 0;
};

const xmlText = (value: string) =>
  value.replace(/&([^;]{1,32});/g, (_, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (Object.hasOwn(named, entity)) return named[entity];
    const number = /^#x[\da-f]+$/i.test(entity)
      ? Number.parseInt(entity.slice(2), 16)
      : /^#\d+$/.test(entity)
        ? Number(entity.slice(1))
        : NaN;
    if (!Number.isInteger(number) || number <= 0 || number > 0x10ffff || (number >= 0xd800 && number <= 0xdfff)) fail();
    return String.fromCodePoint(number);
  });

const positive = (value: string | undefined, maximum: number) => {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) fail();
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > maximum) fail('sheetLimit');
  return number;
};
const cellAddress = (value: string) => {
  const match = /^\$?([A-Z]{1,3})\$?([1-9]\d{0,9})$/.exec(value);
  if (!match) fail();
  const column = [...match[1]].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);
  if (column > XLSX_LIMITS.columns) fail('sheetLimit');
  return { column, row: positive(match[2], XLSX_LIMITS.rows) };
};
const cellRange = (value: string) => {
  const parts = value.split(':');
  if (parts.length > 2) fail();
  const from = cellAddress(parts[0]);
  const to = cellAddress(parts[1] ?? parts[0]);
  if (to.row < from.row || to.column < from.column) fail();
  return (to.row - from.row + 1) * (to.column - from.column + 1);
};

const namedRanges = (value: string) => {
  const ranges: string[] = [];
  let quoted = false;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "'") {
      if (quoted && value[index + 1] === "'") index++;
      else quoted = !quoted;
    } else if (value[index] === ',' && !quoted) {
      ranges.push(value.slice(start, index));
      start = index + 1;
    }
  }
  ranges.push(value.slice(start));
  return ranges.map((range) => range.slice(range.lastIndexOf('!') + 1).trim());
};

type XmlFrame = { name: string; text: number; value?: string; row?: number; column?: number };
type XmlBudget = { nodes: number; cells: number; strings: number; sheets: number };

/** A bounded lexical pass; ExcelJS remains the authoritative XML/value parser. */
export const validateWorkbookXml = (xml: string, budget: XmlBudget = { nodes: 0, cells: 0, strings: 0, sheets: 0 }) => {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) fail('unsupported');
  const stack: XmlFrame[] = [];
  const text = (value: string, cdata = false) => {
    const decoded = cdata ? value : xmlText(value);
    const length = decoded.length;
    for (const frame of stack) {
      if ((frame.name === 'c' || frame.name === 'si') && stack.some((item) => item.name === 't' || item.name === 'v')) {
        frame.text += length;
        if (frame.text > XLSX_LIMITS.textCharacters) fail('textLimit');
      } else if (frame.name === 'definedName') {
        frame.value = (frame.value ?? '') + decoded;
        if (frame.value.length > XLSX_LIMITS.textCharacters) fail('textLimit');
      }
    }
  };
  let cursor = 0;
  while (cursor < xml.length) {
    const start = xml.indexOf('<', cursor);
    if (start < 0) {
      text(xml.slice(cursor));
      break;
    }
    text(xml.slice(cursor, start));
    if (xml.startsWith('<!--', start) || xml.startsWith('<?', start) || xml.startsWith('<![CDATA[', start)) {
      const cdata = xml.startsWith('<![CDATA[', start);
      const comment = xml.startsWith('<!--', start);
      const close = cdata ? ']]>' : comment ? '-->' : '?>';
      const contentStart = start + (cdata ? 9 : comment ? 4 : 2);
      const end = xml.indexOf(close, contentStart);
      if (end < 0) fail();
      if (cdata) text(xml.slice(contentStart, end), true);
      cursor = end + close.length;
      continue;
    }
    let end = start + 1;
    let quote = '';
    for (; end < xml.length; end++) {
      const char = xml[end];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === xml.length) fail();
    const token = xml.slice(start + 1, end).trim();
    cursor = end + 1;
    if (token.startsWith('/')) {
      const frame = stack.pop();
      if (frame?.name !== token.slice(1).trim()) fail();
      if (frame.name === 'definedName') {
        // DefinedNames.model expands rectangular named ranges into a CellMatrix.
        for (const range of namedRanges(frame.value ?? '')) {
          const canonical = /^\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?$/i.test(range);
          // ExcelJS tests for $ anywhere, then decodes the entire (possibly mixed) range.
          if (!canonical && /\$\w+\$\d+/.test(range)) fail('unsupported');
          if (!canonical) continue;
          budget.cells += cellRange(range.toUpperCase());
          if (budget.cells > XLSX_LIMITS.cells) fail('sheetLimit');
        }
      }
      continue;
    }
    const match = /^([A-Za-z_][\w:.-]*)([\s\S]*)$/.exec(token);
    if (!match || stack.length >= 64 || ++budget.nodes > XLSX_LIMITS.xmlNodes) fail('sheetLimit');
    const name = match[1];
    const attributes: Record<string, string> = Object.create(null);
    const selfClosing = token.endsWith('/');
    const tail = match[2].replace(/\/$/, '').trim();
    let offset = 0;
    let attributeCount = 0;
    while (offset < tail.length) {
      const attribute = /^([A-Za-z_][\w:.-]*)\s*=\s*(["'])([\s\S]*?)\2\s*/.exec(tail.slice(offset));
      if (!attribute || ++attributeCount > 64 || Object.hasOwn(attributes, attribute[1])) fail();
      attributes[attribute[1]] = xmlText(attribute[3]);
      offset += attribute[0].length;
    }
    const frame: XmlFrame = { name, text: 0 };
    if (name === 'row') {
      frame.row = positive(attributes.r, XLSX_LIMITS.rows);
      frame.column = 0;
      if (attributes.spans) attributes.spans.split(':').forEach((span) => positive(span, XLSX_LIMITS.columns));
    } else if (name === 'c') {
      const row = stack.findLast((item) => item.name === 'row');
      if (!row?.row) fail();
      const address = attributes.r ? cellAddress(attributes.r) : { row: row.row, column: (row.column ?? 0) + 1 };
      if (address.row !== row.row || address.column > XLSX_LIMITS.columns) fail('sheetLimit');
      row.column = address.column;
      if (++budget.cells > XLSX_LIMITS.cells) fail('sheetLimit');
    } else if (name === 'col') {
      const min = positive(attributes.min, XLSX_LIMITS.columns);
      if (positive(attributes.max, XLSX_LIMITS.columns) < min) fail();
    } else if (name === 'mergeCell') {
      budget.cells += cellRange(attributes.ref ?? '');
      if (budget.cells > XLSX_LIMITS.cells) fail('sheetLimit');
    } else if (name === 'dimension' || name === 'hyperlink' || name === 'autoFilter' || name === 'table') {
      if (attributes.ref) cellRange(attributes.ref);
    } else if (name === 'si' && ++budget.strings > XLSX_LIMITS.cells) fail('sheetLimit');
    else if (name === 'sheet' && ++budget.sheets > XLSX_LIMITS.sheets) fail('sheetLimit');
    if (!selfClosing) stack.push(frame);
  }
  if (stack.length) fail();
};

/** Metadata is only a preflight: every actual output chunk is counted and checked. */
export const validateXlsxArchive = async (
  buffer: ArrayBuffer,
  overrides: Partial<Record<keyof ArchiveLimits, number>> = {},
) => {
  const limits = { ...XLSX_LIMITS, ...overrides };
  const entries = readEntries(buffer, limits);
  const bytes = new Uint8Array(buffer);
  const xmlBudget: XmlBudget = { nodes: 0, cells: 0, strings: 0, sheets: 0 };
  let total = 0;
  for (const entry of entries) {
    const compressed = bytes.subarray(entry.start, entry.end);
    let stream = new Blob([compressed as BlobPart]).stream();
    if (entry.method === 8) {
      try {
        const source: ReadableStream<BufferSource> = stream;
        stream = source.pipeThrough(new DecompressionStream('deflate-raw'));
      } catch {
        fail('unsupported');
      }
    }
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    let crc = 0xffffffff;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        total += next.value.length;
        if (size > limits.entryBytes || total > limits.expandedBytes) fail('archiveLimit');
        crc = updateCrc(crc, next.value);
        chunks.push(next.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error instanceof WorkbookInputError ? error : new WorkbookInputError('parseFailed');
    } finally {
      reader.releaseLock();
    }
    if (size !== entry.expanded || (crc ^ 0xffffffff) >>> 0 !== entry.crc) fail();
    // ExcelJS's worksheet/drawing matchers are not end-anchored; validate their aliases too.
    if (
      /\.(?:xml|rels|vml)$/i.test(entry.name) ||
      /xl\/(?:worksheets|drawings|theme|tables)\/.*\.(?:xml|rels|vml)|xl\/comments\d+\.xml/.test(entry.name)
    ) {
      const output = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
      }
      let xml: string;
      try {
        xml = new TextDecoder('utf-8', { fatal: true }).decode(output);
      } catch {
        fail();
      }
      validateWorkbookXml(xml, xmlBudget);
    }
  }
};
