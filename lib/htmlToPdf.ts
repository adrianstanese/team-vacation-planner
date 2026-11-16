// Turns one of the app's self-contained HTML reports into a real A4-landscape PDF file, in the browser.
// The report is rendered in an off-screen iframe (so its CSS never touches the app), captured page by page
// with html2canvas, and placed into jsPDF. Page breaks fall between rows, month cards and blocks.
// Libraries are loaded only when the user clicks, so they never weigh on the first page load.

const AVOID = "tr, .cal-month, .stat, .tl-row, .hdr, .legend, .tl-title, .cal-title, h1, h2, .s, .card, .row, table thead";

export async function downloadHtmlAsPdf(html: string, filename: string, opts: { format?: "a4" | "a3"; onePage?: boolean } = {}): Promise<void> {
  const a3 = opts.format === "a3", pageW = a3 ? 1587 : 1123, pageH = a3 ? 1123 : 794;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  // No scripts may ever run inside the report frame: a script-src 'none' policy in the report itself. (A sandboxed
  // frame is not used: Safari then blocks html2canvas's own capture step and the export never finishes.)
  const csp = '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'">';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp) : csp + html;
  frame.style.cssText = `position:fixed;left:-12000px;top:0;width:${pageW}px;height:${pageH}px;border:0;`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open(); doc.write(html); doc.close();
    // Reports may auto-print; neutralise that inside the hidden frame

    await new Promise(r => setTimeout(r, 150));
    // Some browsers never settle fonts.ready inside a sandboxed frame: wait at most 1.5 s
    try { await Promise.race([(doc as Document & { fonts?: FontFaceSet }).fonts?.ready, new Promise(r => setTimeout(r, 1500))]); } catch { /* ignore */ }
    const body = doc.body;
    body.style.background = "#ffffff";
    const width = Math.max(body.scrollWidth, pageW);
    const height = Math.max(body.scrollHeight, doc.documentElement.scrollHeight);

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: a3 ? "a3" : "a4", compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), margin = 18;
    const ptPerPx = (pw - 2 * margin) / width;
    const pagePx = Math.floor((ph - 2 * margin) / ptPerPx);

    // Candidate break lines: bottoms of blocks that should not be split
    const top = body.getBoundingClientRect().top;
    const breaks = Array.from(body.querySelectorAll(AVOID))
      .map(el => Math.round((el as HTMLElement).getBoundingClientRect().bottom - top))
      .filter(y => y > 0 && y < height).sort((a, b) => a - b);

    // One-page documents (the wall planner): capture everything at once and scale it to fit the sheet
    if (opts.onePage) {
      const canvas = await html2canvas(body, { backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true,
        x: 0, y: 0, width, height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: 0 });
      const k = Math.min(pw / width, ph / height), w = width * k, h = height * k;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h, undefined, "FAST");
      const blob1 = pdf.output("blob"), url1 = URL.createObjectURL(blob1);
      const a1 = document.createElement("a"); a1.href = url1; a1.download = filename; a1.rel = "noopener"; a1.style.display = "none";
      document.body.appendChild(a1); a1.click(); a1.remove();
      setTimeout(() => URL.revokeObjectURL(url1), 60000);
      return;
    }
    const slices: [number, number][] = [];
    let y0 = 0;
    while (y0 < height - 2) {
      const limit = y0 + pagePx;
      if (limit >= height) { slices.push([y0, height]); break; }
      let cut = limit;
      for (const b of breaks) { if (b > y0 + pagePx * 0.4 && b <= limit) cut = b; }
      slices.push([y0, cut]);
      y0 = cut;
    }

    for (let i = 0; i < slices.length; i++) {
      const [a, b] = slices[i];
      const canvas = await html2canvas(body, {
        backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true,
        x: 0, y: a, width, height: b - a, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: 0,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, width * ptPerPx, (b - a) * ptPerPx, undefined, "FAST");
    }
    // Save the same way as the other exports (a link in the page), which works in every browser
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } finally {
    frame.remove();
  }
}
