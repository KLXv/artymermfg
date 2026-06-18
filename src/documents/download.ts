/** Render a react-pdf document element to a Blob and trigger a download. */
import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export { docName } from "./name";

export async function downloadPdf(doc: ReactElement, filename: string) {
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
