// Turns one of the app's self-contained HTML reports into a real A4-landscape PDF file, in the browser.
// The report is rendered in an off-screen iframe (so its CSS never touches the app), captured page by page
// with html2canvas, and placed into jsPDF. Page breaks fall between rows, month cards and blocks.
// Libraries are loaded only when the user clicks, so they never weigh on the first page load.

const AVOID = "tr, .cal-month, .stat, .tl-row, .hdr, .legend, .tl-title, .cal-title, h1, h2, .s, .card, .row, table thead";

export async function downloadHtmlAsPdf(html: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  // No scripts may ever run inside the report frame (html2canvas only needs to read its DOM)
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.cssText = "position:fixed;left:-12000px;top:0;width:1123px;height:794px;border:0;";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open(); doc.write(html); doc.close();
    // Reports may auto-print; neutralise that inside the hidden frame

    await new Promise(r => setTimeout(r, 150));
    try { await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ignore */ }
    const body = doc.body;
    body.style.background = "#ffffff";
    const width = Math.max(body.scrollWidth, 1123);
    const height = Math.max(body.scrollHeight, doc.documentElement.scrollHeight);

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), margin = 18;
    const ptPerPx = (pw - 2 * margin) / width;
    const pagePx = Math.floor((ph - 2 * margin) / ptPerPx);

    // Candidate break lines: bottoms of blocks that should not be split
    const top = body.getBoundingClientRect().top;
    const breaks = Array.from(body.querySelectorAll(AVOID))
      .map(el => Math.round((el as HTMLElement).getBoundingClientRect().bottom - top))
      .filter(y => y > 0 && y < height).sort((a, b) => a - b);

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
    pdf.save(filename);
  } finally {
    frame.remove();
  }
}
