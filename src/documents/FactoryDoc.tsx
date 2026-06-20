/**
 * Factory documents (PDF) — production spec, contract terms, QC sign-off.
 *
 * A clean, print-ready letterhead carrying the operator's brand logo + name +
 * contact block, then the exact domain-generated text (so the wording stays the
 * debugged source of record). The specification additionally embeds the
 * uploaded reference photos, so the factory sees what each component should
 * look like beside the tolerances.
 */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Company } from "@/domain";
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
  page: { backgroundColor: C.paper, color: C.ink, paddingTop: 42, paddingBottom: 48, paddingHorizontal: 46, fontFamily: "Inter" },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 360 },
  logo: { width: 42, height: 42, objectFit: "contain" },
  sigma: { fontFamily: "Newsreader", fontSize: 30, color: C.brass },
  brandName: { fontFamily: "Newsreader", fontSize: 18, fontWeight: 600, color: C.ink },
  letterhead: { fontFamily: "Inter", fontSize: 7.5, lineHeight: 1.5, color: C.dim, marginTop: 2 },
  docTag: { fontFamily: "IBMPlexMono", fontSize: 7.5, letterSpacing: 1.5, color: C.brass, textTransform: "uppercase", textAlign: "right" },

  rule: { height: 1.4, backgroundColor: C.brass, marginTop: 10, marginBottom: 14 },

  title: { fontFamily: "Newsreader", fontSize: 20, fontWeight: 600, color: C.ink },
  meta: { fontFamily: "IBMPlexMono", fontSize: 8, color: C.dim, marginTop: 4, lineHeight: 1.5 },

  photosKicker: { fontFamily: "IBMPlexMono", fontSize: 7.5, letterSpacing: 1.5, color: C.brass, textTransform: "uppercase", marginTop: 16, marginBottom: 8 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  photoCard: { width: 104, marginBottom: 4 },
  photo: { width: 104, height: 78, objectFit: "cover", borderRadius: 3, backgroundColor: C.panel, borderWidth: 0.6, borderColor: C.line },
  photoLabel: { fontFamily: "IBMPlexMono", fontSize: 6.5, color: C.faint, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 3, textAlign: "center" },

  bodyWrap: { marginTop: 14, borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 12 },
  line: { fontFamily: "IBMPlexMono", fontSize: 7.6, lineHeight: 1.5, color: C.ink },

  foot: { position: "absolute", bottom: 26, left: 46, right: 46, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 6 },
  footText: { fontFamily: "IBMPlexMono", fontSize: 6.5, color: C.faint, letterSpacing: 0.8 },
});

export interface FactoryPhoto {
  label: string;
  src: string;
}

export interface FactoryDocProps {
  kind: "spec" | "terms" | "qc";
  docTag: string; // top-right caption, e.g. "Production specification"
  title: string;
  meta: string[]; // meta lines under the title
  body: string; // pre-generated domain text
  company: Company;
  photos?: FactoryPhoto[]; // embedded only on the spec
}

export function FactoryDoc({ docTag, title, meta, body, company, photos = [] }: FactoryDocProps) {
  const lines = body.split(/\r?\n/);
  const letterhead = (company.letterhead || "").split(/\r?\n/).filter(Boolean);
  const shown = photos.filter((p) => p.src);

  return (
    <Document title={`${company.brand || "Artymer"} — ${title}`} author={company.brand || "Artymer"}>
      <Page size="A4" style={s.page} wrap>
        {/* Letterhead */}
        <View style={s.head} fixed>
          <View style={s.brandWrap}>
            {company.logo ? <Image src={company.logo} style={s.logo} /> : <Text style={s.sigma}>Σ</Text>}
            <View>
              <Text style={s.brandName}>{company.brand || "Artymer"}</Text>
              {letterhead.map((l, i) => (
                <Text key={i} style={s.letterhead}>
                  {l}
                </Text>
              ))}
            </View>
          </View>
          <Text style={s.docTag}>{docTag}</Text>
        </View>

        <View style={s.rule} />

        <Text style={s.title}>{title}</Text>
        {meta.map((m, i) => (
          <Text key={i} style={s.meta}>
            {m}
          </Text>
        ))}

        {/* Reference imagery (spec only) */}
        {shown.length > 0 && (
          <>
            <Text style={s.photosKicker}>Reference imagery — approved-sample target</Text>
            <View style={s.photoGrid}>
              {shown.map((p, i) => (
                <View key={i} style={s.photoCard} wrap={false}>
                  <Image src={p.src} style={s.photo} />
                  <Text style={s.photoLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Body — the exact domain text */}
        <View style={s.bodyWrap}>
          {lines.map((l, i) => (
            <Text key={i} style={s.line}>
              {l || " "}
            </Text>
          ))}
        </View>

        <View style={s.foot} fixed>
          <Text style={s.footText}>{company.brand || "Artymer"} · design + QC authority</Text>
          <Text style={s.footText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
