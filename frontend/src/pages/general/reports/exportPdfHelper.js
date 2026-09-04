/**
 * exportPdfHelper.js - Dedicated Multi-Page PDF Export Engine
 * Uses html2canvas-pro and jsPDF with clean pagination slices and margin padding.
 */
export async function downloadReportAsPdf({ elementId, filename, onStart, onComplete, onError }) {
  if (onStart) onStart();
  try {
    const element = document.getElementById(elementId || "printable-report-area");
    if (!element) {
      throw new Error("Report printable area not found in DOM.");
    }

    const html2canvasModule = await import("html2canvas-pro");
    const html2canvas = html2canvasModule.default || html2canvasModule;
    const { jsPDF } = await import("jspdf");

    // 1. Capture the full multi-table content without viewport or scroll clipping
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1024,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId || "printable-report-area");
        if (clonedElement) {
          clonedElement.style.overflow = "visible";
          clonedElement.style.maxHeight = "none";
          clonedElement.style.height = "auto";
          clonedElement.style.width = "980px";
          clonedElement.style.position = "static";

          // Expand all parent containers in the cloned DOM so scroll containers don't clip
          let parent = clonedElement.parentElement;
          while (parent && parent !== clonedDoc.body) {
            parent.style.overflow = "visible";
            parent.style.maxHeight = "none";
            parent.style.height = "auto";
            parent = parent.parentElement;
          }
        }
      },
    });

    // 2. Setup A4 document in jsPDF with 10mm margins
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const margin = 10; // 10mm margins on all sides
    const printableWidth = pageWidth - (margin * 2); // 190mm
    const printableHeight = pageHeight - (margin * 2); // 277mm

    // 3. Slice the single tall canvas into clean per-page chunks
    const pageCanvasHeight = Math.floor((printableHeight * canvas.width) / printableWidth);
    let renderedHeight = 0;
    let pageNumber = 1;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);

      // Create an individual slice canvas for the page
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, renderedHeight, canvas.width, sliceHeight,
        0, 0, canvas.width, sliceHeight
      );

      const sliceData = pageCanvas.toDataURL("image/jpeg", 0.98);
      const sliceHeightMm = (sliceHeight * printableWidth) / canvas.width;

      if (pageNumber > 1) {
        pdf.addPage();
      }

      pdf.addImage(sliceData, "JPEG", margin, margin, printableWidth, sliceHeightMm);

      renderedHeight += sliceHeight;
      pageNumber++;
    }

    const targetFilename = filename || `FSUU_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(targetFilename);

    if (onComplete) onComplete(targetFilename);
    return true;
  } catch (err) {
    console.error("PDF Export Error:", err);
    if (onError) onError(err);
    return false;
  }
}
