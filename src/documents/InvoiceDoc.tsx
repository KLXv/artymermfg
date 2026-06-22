/**
 * Invoice PDF — a proper Romanian fiscal document (factură): seller + buyer
 * identity (CUI/CIF, Reg. Com.), series + number, issue/due dates, line items
 * with TVA, net/VAT/gross totals, IBAN + payment terms, and a PAID stamp. Falls
 * back cleanly when the business isn't VAT-registered.
 */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Company, Invoice } from "@/domain";
import { invoiceTotals } from "@/domain";
import { registerDocumentFonts } from "./fonts";

registerDocumentFonts();

const C = {
  paper: "#FCFBF7",
  ink: "#1B1D22",
  dim: "#5F636B",
  faint: "#8A8E96",
  brass: "#9C6F22",
  line: "#E0DCD0",
  panel: "#F1EEE6",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.paper, color: C.ink, padding: 42, fontFamily: "Inter", fontSize: 9 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logo: { width: 34, height: 34, objectFit: "contain" },
  sigma: { fontFamily: "Newsreader", fontSize: 26, color: C.brass },
  party: { maxWidth: 250 },
  partyName: { fontFamily: "Newsreader", fontSize: 13, fontWeight: 600, color: C.ink },
  small: { fontSize: 8, color: C.dim, lineHeight: 1.5 },
  docBox: { alignItems: "flex-end" },
  docTitle: { fontFamily: "Newsreader", fontSize: 22, fontWeight: 600, color: C.brass },
  meta: { fontFamily: "IBMPlexMono", fontSize: 8.5, color: C.ink, marginTop: 3 },
  rule: { height: 1.2, backgroundColor: C.brass, marginVertical: 14 },
  label: { fontFamily: "IBMPlexMono", fontSize: 7, letterSpacing: 1, color: C.brass, textTransform: "uppercase", marginBottom: 3 },
  buyer: { marginTop: 4 },

  tHead: { flexDirection: "row", backgroundColor: C.panel, paddingVertical: 5, paddingHorizontal: 6, marginTop: 16 },
  tRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.6, borderBottomColor: C.line },
  th: { fontFamily: "IBMPlexMono", fontSize: 7.5, color: C.dim, textTransform: "uppercase" },
  cDesc: { flex: 1 },
  cNum: { width: 64, textAlign: "right" },
  cQty: { width: 40, textAlign: "right" },

  totals: { marginTop: 12, marginLeft: "auto", width: 240 },
  tot: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totGrand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.brass },
  grand: { fontFamily: "Newsreader", fontSize: 14, fontWeight: 600, color: C.brass },

  pay: { marginTop: 22, borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 10 },
  paid: { marginTop: 14, alignSelf: "flex-start", borderWidth: 1.5, borderColor: "#3F9D6B", borderRadius: 4, paddingVertical: 3, paddingHorizontal: 10, color: "#2F7D52", fontFamily: "IBMPlexMono", fontSize: 11, letterSpacing: 2, transform: "rotate(-4deg)" },
  foot: { position: "absolute", bottom: 26, left: 42, right: 42, textAlign: "center", fontFamily: "IBMPlexMono", fontSize: 7, color: C.faint },
});

const SYMBOL: Record<string, string> = { RON: "lei", EUR: "€", USD: "$" };

export function InvoiceDoc({ invoice, company }: { invoice: Invoice; company: Company }) {
  const t = invoiceTotals(invoice);
  const cur = invoice.currency || "RON";
  const sym = SYMBOL[cur] || cur;
  const fmt = (n: number) => {
    const s2 = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cur === "RON" ? `${s2} ${sym}` : `${sym}${s2}`;
  };
  const vatReg = company.fiscal.vatRegistered;
  const seller = invoice.seller.name ? invoice.seller : {
    name: company.fiscal.legalName || company.brand,
    taxId: company.fiscal.taxId,
    regNo: company.fiscal.regNo,
    address: company.fiscal.address,
    email: "",
  };
  const docName = `${invoice.kind} ${invoice.series}${invoice.number ? "-" + invoice.number : ""}`;

  return (
    <Document title={docName} author={seller.name}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View style={s.party}>
            <View style={s.brandRow}>
              {company.logo ? <Image src={company.logo} style={s.logo} /> : <Text style={s.sigma}>Σ</Text>}
              <Text style={s.partyName}>{seller.name || "—"}</Text>
            </View>
            {seller.taxId ? <Text style={s.small}>CUI/CIF: {seller.taxId}</Text> : null}
            {seller.regNo ? <Text style={s.small}>Reg. Com.: {seller.regNo}</Text> : null}
            {seller.address ? <Text style={s.small}>{seller.address}</Text> : null}
            {company.fiscal.iban ? <Text style={s.small}>IBAN: {company.fiscal.iban}{company.fiscal.bank ? ` · ${company.fiscal.bank}` : ""}</Text> : null}
          </View>
          <View style={s.docBox}>
            <Text style={s.docTitle}>{invoice.kind}</Text>
            <Text style={s.meta}>Seria {invoice.series || "—"}  Nr. {invoice.number || "(ciornă)"}</Text>
            <Text style={s.meta}>Data: {invoice.issueDate || "—"}</Text>
            {invoice.dueDate ? <Text style={s.meta}>Scadență: {invoice.dueDate}</Text> : null}
          </View>
        </View>

        <View style={s.rule} />

        <Text style={s.label}>Client / Cumpărător</Text>
        <View style={s.buyer}>
          <Text style={s.partyName}>{invoice.buyer.name || "—"}</Text>
          {invoice.buyer.taxId ? <Text style={s.small}>CUI/CIF: {invoice.buyer.taxId}</Text> : null}
          {invoice.buyer.regNo ? <Text style={s.small}>Reg. Com.: {invoice.buyer.regNo}</Text> : null}
          {invoice.buyer.address ? <Text style={s.small}>{invoice.buyer.address}</Text> : null}
          {invoice.buyer.email ? <Text style={s.small}>{invoice.buyer.email}</Text> : null}
        </View>

        {/* Line items */}
        <View style={s.tHead}>
          <Text style={[s.th, s.cDesc]}>Denumire produs / serviciu</Text>
          <Text style={[s.th, s.cQty]}>Cant.</Text>
          <Text style={[s.th, s.cNum]}>Preț unitar</Text>
          {vatReg ? <Text style={[s.th, s.cQty]}>TVA</Text> : null}
          <Text style={[s.th, s.cNum]}>Valoare</Text>
        </View>
        {invoice.lines.map((l, i) => {
          const net = (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0);
          return (
            <View style={s.tRow} key={i}>
              <Text style={s.cDesc}>{l.desc || "—"}</Text>
              <Text style={s.cQty}>{l.qty || "0"}</Text>
              <Text style={s.cNum}>{fmt(parseFloat(l.unitPrice) || 0)}</Text>
              {vatReg ? <Text style={s.cQty}>{l.vat || "0"}%</Text> : null}
              <Text style={s.cNum}>{fmt(net)}</Text>
            </View>
          );
        })}

        {/* Totals */}
        <View style={s.totals}>
          {vatReg ? (
            <>
              <View style={s.tot}>
                <Text style={s.small}>Total fără TVA</Text>
                <Text>{fmt(t.net)}</Text>
              </View>
              <View style={s.tot}>
                <Text style={s.small}>TVA</Text>
                <Text>{fmt(t.vat)}</Text>
              </View>
            </>
          ) : null}
          <View style={s.totGrand}>
            <Text style={s.grand}>Total de plată</Text>
            <Text style={s.grand}>{fmt(t.gross)}</Text>
          </View>
        </View>

        {/* Payment + status */}
        <View style={s.pay}>
          {!vatReg ? <Text style={s.small}>Neplătitor de TVA (TVA neaplicabil).</Text> : null}
          {company.fiscal.iban ? <Text style={s.small}>Plata prin transfer în contul IBAN {company.fiscal.iban}{company.fiscal.bank ? ` (${company.fiscal.bank})` : ""}.</Text> : null}
          {invoice.notes ? <Text style={[s.small, { marginTop: 4 }]}>{invoice.notes}</Text> : null}
          {invoice.status === "paid" ? <Text style={s.paid}>ACHITAT{invoice.paidDate ? ` · ${invoice.paidDate}` : ""}</Text> : null}
        </View>

        <Text style={s.foot} fixed>
          {seller.name} · {docName}
        </Text>
      </Page>
    </Document>
  );
}
