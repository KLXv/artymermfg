/**
 * The client-facing dossier (PDF).
 *
 * Non-negotiable Private-Label override, preserved from the original:
 *  - Commission  → Σ leads the cover; credit "Designed and directed by one
 *                  person · Artymer."
 *  - Private label → the client's brand leads; Σ appears only as a small side
 *                  maker's mark ("Crafted by Artymer"); Artymer is never the
 *                  headline and is unnamed in the story.
 * A dark graphite cover (the brand) opens onto a warm paper interior (the read).
 */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { I18N, type Account, type Company, type Project } from "@/domain";
import { registerDocumentFonts } from "./fonts";

registerDocumentFonts();

const C = {
  ground: "#15171C",
  panel: "#20242D",
  brass: "#C9A24B",
  ink: "#E8E8E8",
  dim: "#9AA0AC",
  line: "#2B3039",
  paper: "#F5F2EA",
  paperInk: "#23262B",
  paperDim: "#6B6F77",
  paperLine: "#D9D3C6",
};

const s = StyleSheet.create({
  // Cover
  cover: { backgroundColor: C.ground, color: C.ink, padding: 54, fontFamily: "Inter" },
  coverTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kicker: { fontFamily: "IBMPlexMono", fontSize: 8, letterSpacing: 2, color: C.brass, textTransform: "uppercase" },
  sigma: { fontFamily: "Newsreader", fontSize: 22, color: C.brass },
  heroWrap: { marginTop: 28, height: 300, borderRadius: 6, overflow: "hidden", backgroundColor: C.panel, justifyContent: "center", alignItems: "center" },
  hero: { width: "100%", height: "100%", objectFit: "cover" },
  heroEmpty: { fontFamily: "IBMPlexMono", fontSize: 9, color: C.dim, letterSpacing: 1 },
  coverFoot: { marginTop: 30 },
  brandLead: { fontFamily: "Newsreader", fontSize: 30, fontWeight: 600, color: C.ink },
  pieceLead: { fontFamily: "Newsreader", fontSize: 38, fontWeight: 600, color: C.brass },
  forLine: { fontFamily: "Newsreader", fontSize: 16, color: C.dim, marginTop: 6, fontStyle: "italic" },
  edition: { fontFamily: "IBMPlexMono", fontSize: 9, color: C.dim, marginTop: 14, letterSpacing: 1 },
  rule: { height: 1, backgroundColor: C.brass, width: 48, marginVertical: 18 },
  makerLine: { fontFamily: "IBMPlexMono", fontSize: 8, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase" },

  // Interior
  page: { backgroundColor: C.paper, color: C.paperInk, padding: 54, fontFamily: "Newsreader" },
  secKicker: { fontFamily: "IBMPlexMono", fontSize: 8, letterSpacing: 2, color: C.brass, textTransform: "uppercase", marginBottom: 8 },
  story: { fontFamily: "Newsreader", fontSize: 12.5, lineHeight: 1.7, color: C.paperInk, marginBottom: 18, textAlign: "justify" },
  elementRow: { flexDirection: "row", gap: 16, marginTop: 18 },
  elementImg: { width: 150, height: 110, borderRadius: 4, objectFit: "cover", backgroundColor: "#E6E0D2" },
  elementBody: { flex: 1 },
  elementTitle: { fontFamily: "Newsreader", fontSize: 14, fontWeight: 600, color: C.paperInk },
  elementText: { fontFamily: "Inter", fontSize: 9.5, lineHeight: 1.6, color: C.paperDim, marginTop: 4 },
  hlList: { marginTop: 6 },
  hl: { fontFamily: "Inter", fontSize: 9.5, color: C.paperInk, marginBottom: 3 },
  foot: { position: "absolute", bottom: 32, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.paperLine, paddingTop: 8 },
  footText: { fontFamily: "IBMPlexMono", fontSize: 7.5, color: C.paperDim, letterSpacing: 1 },
});

function elementText(p: Project, kind: "dial" | "case" | "back"): string {
  if (kind === "dial") {
    const cols = p.colors.map((c) => c.name).filter(Boolean).join(", ");
    return [p.dialMat && `${p.dialMat} base`, p.tex && p.tex !== "None" && `${p.tex} texture`, cols && `in ${cols}`]
      .filter(Boolean)
      .join(" · ");
  }
  if (kind === "case") {
    return [p.caseMat, p.caseDia && `Ø ${p.caseDia} mm`, p.caseFin, p.wr].filter(Boolean).join(" · ");
  }
  return [p.engLoc, p.engTxt && `“${p.engTxt}”`, p.back].filter(Boolean).join(" · ");
}

export function Dossier({ project: p, account, company }: { project: Project; account?: Account; company: Company }) {
  const t = I18N[p.lang] || I18N.EN;
  const pl = (p.servicePath || account?.servicePath) === "Private label";
  const client = account?.name || "";
  const piece = p.pieceName || p.name || "Untitled piece";

  const elements: { title: string; img: string; body: string }[] = [
    { title: t.elDial, img: p.images.dial, body: elementText(p, "dial") },
    { title: t.elCase, img: p.images.caseImg, body: elementText(p, "case") },
    { title: t.elBack, img: p.images.back, body: elementText(p, "back") },
  ].filter((e) => e.body || e.img);

  return (
    <Document title={`${piece} — Dossier`} author={pl ? client : company.brand}>
      {/* Cover */}
      <Page size="A4" style={s.cover}>
        <View style={s.coverTop}>
          <Text style={s.kicker}>{t.bespoke}</Text>
          {/* In PL mode the Σ retreats to a small side mark; in Commission it leads. */}
          {!pl && <Text style={s.sigma}>Σ</Text>}
        </View>

        <View style={s.heroWrap}>
          {p.images.hero ? <Image src={p.images.hero} style={s.hero} /> : <Text style={s.heroEmpty}>— hero image —</Text>}
        </View>

        <View style={s.coverFoot}>
          {pl ? (
            <>
              {client ? <Text style={s.brandLead}>{client}</Text> : null}
              <Text style={s.pieceLead}>{piece}</Text>
            </>
          ) : (
            <>
              <Text style={s.pieceLead}>{piece}</Text>
              {client ? <Text style={s.forLine}>{t.forClient(client)}</Text> : null}
            </>
          )}
          {p.edition ? <Text style={s.edition}>{p.edition}</Text> : null}
          <View style={s.rule} />
          <Text style={s.makerLine}>{pl ? `Σ  ${t.maker}` : t.credit}</Text>
        </View>
      </Page>

      {/* Interior — the read */}
      <Page size="A4" style={s.page} wrap>
        <Text style={s.secKicker}>{t.piece}</Text>
        {(p.story || t.storyPlaceholder).split(/\n{2,}/).map((para, i) => (
          <Text key={i} style={s.story}>
            {para.trim()}
          </Text>
        ))}

        {elements.map((e, i) => (
          <View key={i} style={s.elementRow} wrap={false}>
            {e.img ? <Image src={e.img} style={s.elementImg} /> : null}
            <View style={s.elementBody}>
              <Text style={s.elementTitle}>{e.title}</Text>
              {e.body ? <Text style={s.elementText}>{e.body}</Text> : null}
            </View>
          </View>
        ))}

        {p.highlights ? (
          <View style={s.hlList}>
            <Text style={s.secKicker}>{/* small heading */}—</Text>
            {p.highlights
              .split("\n")
              .map((h) => h.trim())
              .filter(Boolean)
              .map((h, i) => (
                <Text key={i} style={s.hl}>
                  — {h}
                </Text>
              ))}
          </View>
        ) : null}

        <View style={s.foot} fixed>
          <Text style={s.footText}>{pl ? t.maker : "Σ  Artymer"}</Text>
          <Text style={s.footText}>{piece}</Text>
        </View>
      </Page>
    </Document>
  );
}
