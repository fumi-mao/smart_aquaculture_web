import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function downloadBase64File(filename: string, base64: string, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  const input = String(base64 || '').trim();
  const dataIdx = input.indexOf(',');
  const raw = input.startsWith('data:') && dataIdx > -1 ? input.slice(dataIdx + 1) : input;
  let b64 = raw.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  try {
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    // Edge/IE 兼容
    const navAny = navigator as any;
    if (navAny && typeof navAny.msSaveOrOpenBlob === 'function') {
      navAny.msSaveOrOpenBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setTimeout(() => a.remove(), 10000);
  } catch {
    const a = document.createElement('a');
    a.href = `data:${mime};base64,${b64}`;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 10000);
  }
}

export function downloadBinaryFile(filename: string, buffer: ArrayBuffer, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  if (!buffer) return;
  const blob = new Blob([buffer], { type: mime });
  const navAny = navigator as any;
  if (navAny && typeof navAny.msSaveOrOpenBlob === 'function') {
    navAny.msSaveOrOpenBlob(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  setTimeout(() => a.remove(), 10000);
}

/**
 * DOM 节点导出为 PDF 的配置项
 * 作用：定义导出范围、文件名、页面尺寸、截图倍率、克隆节点样式调整等参数。
 * 输入：
 *  - element: 需要导出的 DOM 节点
 *  - filename: 下载文件名（建议自行做非法字符过滤）
 * 输出：无（触发浏览器下载）
 */
export type DownloadElementAsPdfOptions = {
  element: HTMLElement;
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4';
  marginPt?: number;
  scale?: number;
  backgroundColor?: string;
  ignoreSelector?: string;
  onClone?: (clonedElement: HTMLElement, clonedDocument: Document) => void;
};

/**
 * 导出指定 DOM 节点为 PDF
 * 作用：将页面上的图表/内容区域在前端转成 PDF 并自动下载。
 * 输入：
 *  - options: DownloadElementAsPdfOptions
 * 输出：无（触发浏览器下载）
 * 逻辑：
 *  1. 使用 html2canvas 将 DOM 渲染为 Canvas（支持 onClone 调整克隆节点样式）
 *  2. 使用 jsPDF 将 Canvas 图片写入 PDF
 *  3. 当内容超过一页时自动分页
 */
export async function downloadElementAsPdf({
  element,
  filename,
  orientation = 'landscape',
  format = 'a4',
  marginPt = 24,
  scale = 2,
  backgroundColor = '#ffffff',
  ignoreSelector,
  onClone,
}: DownloadElementAsPdfOptions) {
  if (!element) return;

  const canvas = await html2canvas(element, {
    backgroundColor,
    scale,
    useCORS: true,
    ignoreElements: ignoreSelector
      ? (el) => (el as Element).matches?.(ignoreSelector)
      : undefined,
    onclone: (clonedDocument) => {
      const clonedElement = clonedDocument.getElementById(element.id) as HTMLElement | null;
      if (!clonedElement) return;
      onClone?.(clonedElement, clonedDocument);
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({ orientation, unit: 'pt', format });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginPt * 2;
  const contentHeight = pageHeight - marginPt * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginPt;

  pdf.addImage(imgData, 'PNG', marginPt, position, imgWidth, imgHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 1) {
    pdf.addPage();
    position = marginPt - (imgHeight - heightLeft);
    pdf.addImage(imgData, 'PNG', marginPt, position, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }

  pdf.save(filename);
}

/**
 * 多元素分页导出 PDF 的配置项
 * 作用：将一组 DOM 元素按固定数量分页，逐页生成 PDF，确保不会被分页裁切。
 * 输入：
 *  - elements: 需要导出的元素列表（按页面展示顺序）
 *  - filename: 下载文件名
 *  - itemsPerPage: 每页放置的元素数量（例如 3）
 *  - headerBuilder: 可选的页眉构建函数（用于每页顶部标题/日期范围等）
 * 输出：无（触发浏览器下载）
 */
export type DownloadPagedElementsAsPdfOptions = {
  elements: HTMLElement[];
  filename: string;
  itemsPerPage: number | ((ctx: { pageIndex: number }) => number);
  headerBuilder?: (ctx: { pageIndex: number; totalPages: number }) => HTMLElement;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4';
  marginPt?: number;
  scale?: number;
  backgroundColor?: string;
  ignoreSelector?: string;
  wrapperWidthPx?: number;
  chartHeightPx?: number | ((ctx: { pageIndex: number }) => number);
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkRotateDeg?: number;
  watermarkFontSizePx?: number;
  watermarkGapPx?: number;
};

/**
 * 多元素分页导出 PDF
 * 作用：将页面上的多个图表/模块按固定数量分页导出，避免“第一页正常，后续页被裁切/错位”的问题。
 * 输入：
 *  - options: DownloadPagedElementsAsPdfOptions
 * 输出：无（触发浏览器下载）
 * 逻辑：
 *  1. 将当前页面的目标元素逐个 clone 到离屏容器中（不影响原页面）
 *  2. 每页容器使用 html2canvas 截图得到单页图片
 *  3. 使用 jsPDF 将每页图片写入 PDF（每页一张完整图片），保证分页边界稳定
 */
export async function downloadPagedElementsAsPdf({
  elements,
  filename,
  itemsPerPage,
  headerBuilder,
  orientation = 'landscape',
  format = 'a4',
  marginPt = 24,
  scale = 2,
  backgroundColor = '#ffffff',
  ignoreSelector,
  wrapperWidthPx = 780,
  chartHeightPx = 0,
  watermarkText,
  watermarkOpacity = 0.12,
  watermarkRotateDeg = -25,
  watermarkFontSizePx = 24,
  watermarkGapPx = 110,
}: DownloadPagedElementsAsPdfOptions) {
  if (!elements || elements.length === 0) return;
  if (!itemsPerPage) return;

  const pdf = new jsPDF({ orientation, unit: 'pt', format });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginPt * 2;
  const contentHeight = pageHeight - marginPt * 2;

  const safeElements = elements.filter(Boolean);

  const getItemsPerPage = (pageIndex: number) => {
    const n = typeof itemsPerPage === 'function' ? itemsPerPage({ pageIndex }) : itemsPerPage;
    const v = Number(n);
    return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
  };

  const getChartHeightPx = (pageIndex: number) => {
    const n = typeof chartHeightPx === 'function' ? chartHeightPx({ pageIndex }) : chartHeightPx;
    const v = Number(n);
    return Number.isFinite(v) && v >= 120 ? v : 0;
  };

  const pages: HTMLElement[][] = [];
  let cursor = 0;
  let pageIndexForSplit = 0;
  while (cursor < safeElements.length) {
    const count = getItemsPerPage(pageIndexForSplit);
    pages.push(safeElements.slice(cursor, cursor + count));
    cursor += count;
    pageIndexForSplit += 1;
  }
  const totalPages = pages.length;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageItems = pages[pageIndex] || [];
    if (pageItems.length === 0) continue;
    const requestedWidthPx = Math.round(wrapperWidthPx);
    const resolvedWrapperWidthPx = Math.min(980, Math.max(520, Number.isFinite(requestedWidthPx) ? requestedWidthPx : 780));
    const sidePaddingPx = 14;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-100000px';
    wrapper.style.top = '0';
    wrapper.style.zIndex = '-1';
    wrapper.style.backgroundColor = backgroundColor;
    wrapper.style.padding = `6px ${sidePaddingPx}px 12px ${sidePaddingPx}px`;
    wrapper.style.width = `${resolvedWrapperWidthPx}px`;
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '10px';
    wrapper.style.overflow = 'visible';
    const minHeightPx = Math.max(1, Math.round(resolvedWrapperWidthPx * (contentHeight / contentWidth)));
    wrapper.style.minHeight = `${minHeightPx}px`;

    if (watermarkText) {
      const wm = document.createElement('div');
      wm.style.position = 'absolute';
      wm.style.left = '-20%';
      wm.style.top = '-20%';
      wm.style.width = '140%';
      wm.style.height = '140%';
      wm.style.zIndex = '0';
      wm.style.pointerEvents = 'none';
      wm.style.userSelect = 'none';
      wm.style.opacity = '1';
      wm.style.backgroundRepeat = 'repeat';
      wm.style.backgroundPosition = '0 0';

      const tileCanvas = document.createElement('canvas');
      const ctx = tileCanvas.getContext('2d');
      if (ctx) {
        const fontWeight = 700;
        const fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
        ctx.font = `${fontWeight} ${watermarkFontSizePx}px ${fontFamily}`;
        const metrics = ctx.measureText(watermarkText);
        const textW = Math.max(1, Math.ceil(metrics.width));
        const tileW = Math.max(220, textW + watermarkGapPx * 2);
        const tileH = Math.max(160, Math.ceil(watermarkFontSizePx * 2.4 + watermarkGapPx * 1.4));
        tileCanvas.width = tileW;
        tileCanvas.height = tileH;

        ctx.clearRect(0, 0, tileW, tileH);
        ctx.font = `${fontWeight} ${watermarkFontSizePx}px ${fontFamily}`;
        ctx.fillStyle = '#9ca3af';
        ctx.globalAlpha = Math.max(0, Math.min(1, watermarkOpacity));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const rad = (Number(watermarkRotateDeg) || 0) * (Math.PI / 180);
        const draw = (x: number, y: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rad);
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        };

        draw(tileW * 0.28, tileH * 0.32);
        draw(tileW * 0.78, tileH * 0.82);

        wm.style.backgroundImage = `url(${tileCanvas.toDataURL('image/png')})`;
        wm.style.backgroundSize = `${tileW}px ${tileH}px`;
      }

      wrapper.appendChild(wm);
    }

    if (headerBuilder) {
      const header = headerBuilder({ pageIndex, totalPages });
      if (header) {
        header.style.position = 'relative';
        header.style.zIndex = '1';
        wrapper.appendChild(header);
      }
    }

    pageItems.forEach((el) => {
      const cloned = el.cloneNode(true) as HTMLElement;
      cloned.style.width = '100%';
      cloned.style.minWidth = '0';
      cloned.style.position = 'relative';
      cloned.style.zIndex = '1';
      const chartBlocks = cloned.querySelectorAll('.chart-no-outline');
      chartBlocks.forEach((node) => {
        const n = node as HTMLElement;
        n.style.minWidth = '0';
        n.style.width = '100%';
        const h = getChartHeightPx(pageIndex);
        if (h > 0) n.style.height = `${h}px`;
      });
      const titleRow = cloned.querySelector('[data-trend-title-row="true"]') as HTMLElement | null;
      if (titleRow) {
        titleRow.style.marginLeft = '0';
        titleRow.style.marginRight = '0';
        titleRow.style.justifyContent = 'center';
      }
      wrapper.appendChild(cloned);
    });

    document.body.appendChild(wrapper);

    const canvas = await html2canvas(wrapper, {
      backgroundColor,
      scale,
      useCORS: true,
      ignoreElements: ignoreSelector
        ? (el) => (el as Element).matches?.(ignoreSelector)
        : undefined,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidthRaw = contentWidth;
    const imgHeightRaw = (canvas.height * imgWidthRaw) / canvas.width;
    let renderWidth = imgWidthRaw;
    let renderHeight = imgHeightRaw;
    let x = marginPt;
    let y = marginPt;

    if (renderHeight > contentHeight) {
      const ratio = contentHeight / renderHeight;
      renderHeight = contentHeight;
      renderWidth = renderWidth * ratio;
      x = marginPt + (contentWidth - renderWidth) / 2;
    }

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);

    wrapper.remove();
  }

  pdf.save(filename);
}
