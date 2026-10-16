/**
 * 仅供测试使用的 PDF 夹具构造器：用纯 JS 拼出**真实结构**的 PDF 字节
 * （对象 + 经典 xref + trailer），包括放大/畸形夹具。生产代码不引用本文件。
 *
 * 刻意不依赖 node:zlib —— 需要真实 zlib 压缩流的用例在各自的 *.test.ts 里自行压缩，
 * 这里只负责结构；这样 jsdom 用例也能直接复用。
 */

const encoder = new TextEncoder();

export type PdfFixtureObject = { id: number; body: string | Uint8Array };

export const textBytes = (text: string) => encoder.encode(text);

export const concatBytes = (parts: Array<string | Uint8Array>): Uint8Array => {
  const encoded = parts.map((part) => (typeof part === 'string' ? encoder.encode(part) : part));
  const total = encoded.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let cursor = 0;
  for (const part of encoded) {
    result.set(part, cursor);
    cursor += part.length;
  }
  return result;
};

/** 流对象体：`<< dict /Length n >>\nstream\n<data>\nendstream` */
export const streamBody = (dict: string, data: string | Uint8Array) =>
  concatBytes([
    `<< ${dict}${dict ? ' ' : ''}/Length ${typeof data === 'string' ? encoder.encode(data).length : data.length} >>\nstream\n`,
    data,
    '\nendstream',
  ]);

/** 生成带经典 xref 的合法 PDF（对象可乱序传入，缺失编号写成 free 项）。 */
export const buildPdfBytes = (objects: PdfFixtureObject[], trailerExtra = ''): Uint8Array => {
  const chunks: Array<string | Uint8Array> = [];
  const offsets = new Map<number, number>();
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  push('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  for (const object of [...objects].sort((left, right) => left.id - right.id)) {
    offsets.set(object.id, length);
    push(`${object.id} 0 obj\n`);
    push(object.body);
    push('\nendobj\n');
  }

  const maxId = objects.reduce((max, object) => Math.max(max, object.id), 0);
  const xrefOffset = length;
  push(`xref\n0 ${maxId + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= maxId; id++) {
    const offset = offsets.get(id);
    push(offset === undefined ? '0000000000 65535 f \n' : `${String(offset).padStart(10, '0')} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${maxId + 1} /Root 1 0 R${trailerExtra ? ` ${trailerExtra}` : ''} >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return concatBytes(chunks);
};

/** 正常两页报告：与 pdfWriter.buildImagePdf 输出同构（目录 / 页树 / 页 / 内容流 / DCT 图片流）。 */
export const twoPageReportPdf = (): Uint8Array => {
  const image = new Uint8Array(512).fill(7);
  const content = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
  const page = (pageId: number, contentId: number, imageId: number) =>
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] ` +
    `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  const imageDict =
    '/Type /XObject /Subtype /Image /Width 794 /Height 1123 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode';
  return buildPdfBytes([
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>' },
    { id: 3, body: page(3, 4, 5) },
    { id: 4, body: streamBody('', content) },
    { id: 5, body: streamBody(imageDict, image) },
    { id: 6, body: page(6, 7, 8) },
    { id: 7, body: streamBody('', content) },
    { id: 8, body: streamBody(imageDict, image) },
  ]);
};

/** 页树声明式放大：根 /Pages 的 /Count 远超页数上限（PDF.js 的 numPages 就来自它）。 */
export const declaredCountBombPdf = (declared = 100_000_000): Uint8Array =>
  buildPdfBytes([
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: `<< /Type /Pages /Kids [3 0 R] /Count ${declared} >>` },
    { id: 3, body: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] >>' },
  ]);

/** 深层嵌套页树：depth 层 /Pages 节点后挂一个真实 Page。 */
export const deepPageTreePdf = (depth: number): Uint8Array => {
  const objects: PdfFixtureObject[] = [{ id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' }];
  const pageId = 2 + depth;
  for (let level = 0; level < depth; level++) {
    const id = 2 + level;
    const kid = level === depth - 1 ? pageId : id + 1;
    objects.push({ id, body: `<< /Type /Pages /Kids [${kid} 0 R] /Count 1 >>` });
  }
  objects.push({ id: pageId, body: `<< /Type /Page /Parent ${1 + depth} 0 R /MediaBox [0 0 595.28 841.89] >>` });
  return buildPdfBytes(objects);
};

/** 单页 + count 个真实的 /Annots 对象。 */
export const annotationHeavyPdf = (count: number): Uint8Array => {
  const annotIds = Array.from({ length: count }, (_, index) => 4 + index);
  return buildPdfBytes([
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      id: 3,
      body:
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] ' +
        `/Annots [${annotIds.map((id) => `${id} 0 R`).join(' ')}] >>`,
    },
    ...annotIds.map((id) => ({ id, body: '<< /Type /Annot /Subtype /Link /Rect [0 0 1 1] >>' })),
  ]);
};

/** 单页 + count 个字体对象（均无内嵌字体文件）。 */
export const fontHeavyPdf = (count: number): Uint8Array => {
  const fontIds = Array.from({ length: count }, (_, index) => 4 + index);
  return buildPdfBytes([
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      id: 3,
      body:
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << ' +
        `${fontIds.map((id, index) => `/F${index} ${id} 0 R`).join(' ')} >> >> >>`,
    },
    ...fontIds.map((id) => ({ id, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' })),
  ]);
};

/** 单页 + 内容流（内容流为原样文本，不加过滤器）。 */
export const contentOnlyPdf = (content: string, dict = ''): Uint8Array =>
  buildPdfBytes([
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    { id: 3, body: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R >>' },
    { id: 4, body: streamBody(dict, content) },
  ]);

/** 既无 Catalog 也无页树的字节：预检应当不做预算判定，交给 PDF.js 报错。 */
export const notAPdf = (): Uint8Array => textBytes('this file is not a PDF at all\n');

/** 只写头部 + 对象 + %%EOF（没有经典 xref/trailer），用于 xref 流式 PDF。 */
export const buildRawPdfBytes = (objects: PdfFixtureObject[]): Uint8Array => {
  const parts: Array<string | Uint8Array> = ['%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'];
  for (const object of [...objects].sort((left, right) => left.id - right.id)) {
    parts.push(`${object.id} 0 obj\n`, object.body, '\nendobj\n');
  }
  parts.push('%%EOF\n');
  return concatBytes(parts);
};

/**
 * 现代布局：目录与页树都放在**未压缩**的 /Type /ObjStm 对象流里，且没有 `trailer` 关键字，
 * 只能靠 /Type /XRef 对象的 /Root 找到目录。用于验证对象流解码与无 trailer 的目录解析。
 */
export const objectStreamPdf = (): Uint8Array => {
  const bodies = [
    { id: 1, body: '<< /Type /Catalog /Pages 3 0 R >>' },
    { id: 3, body: '<< /Type /Pages /Kids [4 0 R] /Count 1 >>' },
    { id: 4, body: '<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595.28 841.89] /Contents 5 0 R >>' },
  ];
  const pairs: string[] = [];
  let offset = 0;
  for (const item of bodies) {
    pairs.push(`${item.id} ${offset}`);
    offset += encoder.encode(item.body).length + 1; // 对象体之间以单个空格分隔
  }
  const header = `${pairs.join(' ')} `;
  const first = encoder.encode(header).length;
  const decoded = header + bodies.map((item) => item.body).join(' ');
  return buildRawPdfBytes([
    { id: 2, body: streamBody(`/Type /ObjStm /N ${bodies.length} /First ${first}`, decoded) },
    { id: 5, body: streamBody('', 'q 1 0 0 1 0 0 cm Q') },
    { id: 6, body: streamBody('/Type /XRef /Size 7 /Root 1 0 R', new Uint8Array([0, 0, 0, 1, 0, 2])) },
  ]);
};
