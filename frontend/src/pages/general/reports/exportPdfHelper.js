/**
 * exportPdfHelper.js - Dedicated PDF Export Engine using html2canvas and jsPDF
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

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
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
