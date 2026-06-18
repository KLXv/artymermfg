/**
 * Certificate of authenticity (PDF). Warm paper, brass frame, serif voice.
 * Honors the same Private-Label rule: in PL mode the client's brand leads and
 * Artymer is only the small maker's mark; in Commission the Σ credit leads.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { I18N, type Account, type Company, type Project } from "@/domain";
import { registerDocumentFonts } from "./fonts";

registerDocumentFonts();

const C = {
  paper: "#F5F2EA",
  ink: "#23262B",
  dim: "#6B6F77",
  brass: "#C9A24B",
  line: "#D9D3C6",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.paper, padding: 40, fontFamily: "Newsreader", color: C.ink },
  frame: { flex: 1, borderWidth: 1.5, borderColor: C.brass, padding: 36, alignItems: "center", justifyContent: "space-between" },
  inner: { borderWidth: 0.75, borderColor: C.line, position: "absolute", top: 6, left: 6, right: 6, bottom: 6 },
  sigma: { fontFamily: "Newsreader", fontSize: 26, color: C.brass, marginBottom: 6 },
  kicker: { fontFamily: "IBMPlexMono", fontSize: 8, letterSpacing: 3, color: C.dim, textTransform: "uppercase" },
  title: { fontFamily: "Newsreader", fontSize: 26, fontWeight: 600, textAlign: "center", marginTop: 14 },
  rule: { height: 1, backgroundColor: C.brass, width: 60, marginVertical: 16 },
  brandLead: { fontFamily: "Newsreader", fontSize: 22, fontWeight: 600, textAlign: "center" },
  piece: { fontFamily: "Newsreader", fontSize: 18, fontStyle: "italic", color: C.brass, textAlign: "center", marginTop: 4 },
  meta: { fontFamily: "Inter", fontSize: 10, color: C.dim, textAlign: "center", marginTop: 6 },
  specs: { alignItems: "center", marginTop: 10 },
  spec: { fontFamily: "Inter", fontSize: 9.5, color: C.ink, marginBottom: 3 },
  footRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footLabel: { fontFamily: "IBMPlexMono", fontSize: 7.5, color: C.dim, letterSpacing: 1, textTransform: "uppercase" },
  footValue: { fontFamily: "Newsreader", fontSize: 11, color: C.ink, marginTop: 2 },
  signLine: { borderTopWidth: 0.75, borderTopColor: C.ink, width: 150, marginTop: 18, paddingTop: 4 },
});

export function Certificate({ project: p, account, company }: { project: Project; account?: Account; company: Company }) {
  const t = I18N[p.lang] || I18N.EN;
  const pl = (p.servicePath || account?.servicePath) === "Private label";
  const client = account?.name || "";
  const piece = p.pieceName || p.name || "Untitled piece";
  const recipient = account?.contactName || client;
  const date = p.qc.signedDate || p.balanceDate || "";

  return (
    <Document title={`${piece} — Certificate`} author={pl ? client : company.brand}>
      <Page size="A5" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.inner} />
          <View style={{ alignItems: "center" }}>
            <Text style={s.sigma}>Σ</Text>
            <Text style={s.kicker}>{pl ? t.maker : "Artymer"}</Text>
            <Text style={s.title}>{t.certTitle}</Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <View style={s.rule} />
            {pl && client ? <Text style={s.brandLead}>{client}</Text> : null}
            <Text style={s.piece}>{piece}</Text>
            {p.edition ? <Text style={s.meta}>{p.edition}</Text> : null}
            {client ? <Text style={s.meta}>{t.createdFor(client)}</Text> : null}
            {recipient ? <Text style={s.meta}>{t.issuedTo(recipient)}</Text> : null}

            <View style={s.specs}>
              <Text style={s.spec}>{t.movement(p.cal || "—", p.crysMat || "—")}</Text>
              {p.wr ? <Text style={s.spec}>{t.wr(p.wr)}</Text> : null}
              <Text style={s.spec}>{t.guarantee}</Text>
            </View>
          </View>

          <View style={s.footRow}>
            <View>
              <Text style={s.footLabel}>Date</Text>
              <Text style={s.footValue}>{date || "—"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={s.signLine}>
                <Text style={s.footLabel}>Signed</Text>
                <Text style={s.footValue}>{pl ? t.maker : "Artymer · Watchmaker & Founder"}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
