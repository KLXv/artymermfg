/**
 * Supplier-language (Simplified Chinese) document generators.
 *
 * A faithful translation of the English documents in `documents.ts`, for the
 * mainland-China OEM partner. Same inputs, same structure (the production
 * specification, the trade-assurance contract terms, and the QC sign-off) so a
 * factory reads the exact same governance in 中文. The English versions remain
 * the source of record; this is the toggled supplier copy.
 */
import { acctName, cfg } from "./finance";
import { D, RULE, V, num } from "./format";
import { today } from "./factories";
import { projVerdict } from "./qc";
import type { Account, Company, Project, Supplier } from "./types";

type AccountMap = Record<string, Account>;
type SupplierMap = Record<string, Supplier>;

const VERDICT_ZH: Record<string, string> = {
  ACCEPT: "接收 (ACCEPT)",
  REJECT: "拒收 (REJECT)",
  PENDING: "待定 (PENDING)",
};

/** A free-text note rendered as an indented, wrapped block under a section. */
const noteLines = (label: string, val: string): string[] => {
  const t = (val || "").trim();
  if (!t) return [];
  const rows = t.split(/\r?\n/);
  return rows.map((r, i) => `   ${(i === 0 ? label : "").padEnd(6)}${r}`);
};

export const specTextZh = (p: Project, accounts: AccountMap, suppliers: SupplierMap): string => {
  const L: string[] = [];
  L.push("Σ  ARTYMER — 生产规格书");
  L.push(
    `项目：${V(p.name)}   客户：${V(acctName(p, accounts))}   数量：${V(p.qty)} 件   版本：${V(p.rev)}   ${today()}`,
  );
  L.push(`制造商：${V(suppliers[p.supplierId]?.name || p.maker)}   权责：Artymer（设计 + 品控签收）`);
  L.push(
    RULE,
    "主控规则",
    "每一项参数均须为公差范围内的可测量值，或在 D65 光源下与批准的首件",
    "样品一致。任何主观描述不得作为合格判据。未经事先书面批准，不得替换",
    "任何部件。",
    RULE,
  );
  L.push("1. 选定配置（选用，非设计）");
  L.push(`   表壳    型号 ${V(p.caseRef)} · ${V(p.caseMat)}`);
  L.push(`           直径 Ø ${D(p.caseDia, p.caseDiaT, "mm")} · 耳间距 ${V(p.l2l)} mm · 厚 ${V(p.thick)} mm · 耳宽 ${V(p.lugW)} mm`);
  L.push(`           表面处理 ${V(p.caseFin)} · 防水 ${V(p.wr)}`);
  L.push(...noteLines("备注", p.caseNote));
  L.push(`   机芯    原装 ${V(p.cal)}（${V(p.calFn)}） · ${V(p.acc)} 秒/${p.accUnit === "month" ? "月" : "日"}`);
  L.push("           核验：装壳前对机芯底板字样拍摄微距");
  L.push(`   指针    ${V(p.handRef)} · ${V(p.handLen)} · ${V(p.handFin)} · 夜光 ${V(p.lume)}`);
  L.push(...noteLines("备注", p.movementNote));
  L.push(`   表镜    ${V(p.crysMat)} · ${V(p.crysShape)} · 镀膜 ${V(p.ar)} · 直径 Ø ${D(p.crysDia, p.crysDiaT, "mm")}`);
  L.push(`   表冠 ${V(p.crown)} · 表背 ${V(p.back)} · 表带 ${V(p.strap)}`);
  L.push(...noteLines("备注", p.crystalNote));
  L.push(RULE, "2. 表盘（由 Artymer 设计）");
  L.push(`   盘基    ${V(p.dialMat)} · 直径 Ø ${D(p.dialDia, p.dialDiaT, "mm")} · 厚度 ${D(p.dialThk, p.dialThkT, "mm")}`);
  L.push(`   盘脚    ${V(p.feet)}（须匹配机芯 ${V(p.cal)}）`);
  L.push(`   纹理    ${V(p.tex)} · 深度 ${D(p.texDepth, p.texDepthT, "mm")} · 光泽度 ${V(p.gloss)} GU`);
  L.push("   颜色    （锁定为 D65 光源下批准的首件样品；以下为样前参考：）");
  p.colors.forEach((c, i) => L.push(`           ${String(i + 1).padStart(2, "0")}  ${V(c.name)} — 参考 ${V(c.ref)}`));
  L.push(`   印刷    ${V(p.print)} · 套准 ≤ ${V(p.reg)} mm 至基准`);
  L.push("           纹理区域禁止移印 —— 纹理上仅可贴花/镶贴");
  L.push(`   时标    ${V(p.marker)} · 位置 ≤ ${V(p.markerPos)} mm 至基准 · ${V(p.markerAtt)}`);
  L.push(`   日历    ${p.date === "none" ? "无" : V(p.date)}`);
  if ((p.dialGrad || "Solid") !== "Solid") L.push(`   盘面    ${V(p.dialGrad)} 盘面 —— 颜色过渡须符合批准样品`);
  L.push(...noteLines("备注", p.dialNote));
  L.push(RULE, "3. 镌刻", `   ${V(p.engLoc)} · “${V(p.engTxt)}” · ${V(p.engMethod)} · 深度 ${V(p.engDepth)} mm`);
  L.push(...noteLines("备注", p.engNote));
  L.push(RULE, "4. 装配与成表公差（须对照工厂核验）");
  L.push(`   表盘同心度    ≤ ${V(p.center)} mm`);
  L.push(`   指针对位      时标 ≤ ${V(p.align)}° ；12:00:00 时三针重合`);
  L.push(`   针镜间隙      ≥ ${V(p.clear)} mm，全程不触碰`);
  L.push(`   表圈/字圈     ≤ ${V(p.bezel)} mm 至基准`);
  L.push(`   防水          ${V(p.wrTest)}`);
  L.push(`   洁净度        ${V(p.clean)}`);
  if (p.lume !== "none") L.push(`   夜光          ${V(p.lumeStd)}`);
  L.push(RULE, "5. 合格判定参照链");
  L.push("   1) CAD + 图稿 + 渲染图批准（开模前）—— 设计锁定");
  L.push("   2) 生产模具的首件 = 批准样品");
  L.push("   3) 全批次在上述公差内与样品一致");
  L.push("   4) 批准样品由 Artymer 留存，用于管控翻单");
  L.push(RULE, "6. 出货前品控影像（余款放行前）");
  L.push("   • 一段连续、未剪辑的视频 —— 不得有剪切（拼接即视为不接受）");
  L.push("   • 开头拍摄订单号 + 日期纸，平移并清点全批数量");
  L.push("   • 逐件、编号、微距：表盘、指针、日历、表镜（无异物）、");
  L.push("     表背镌刻、秒针走动");
  L.push("   • 另附片段：封底前拍摄机芯字样");
  L.push("   • 中性 5000–6500 K，中性背景，≥ 1080p；并附逐件静态照片");
  return L.join("\n");
};

export const termsTextZh = (p: Project, accounts: AccountMap, company: Company): string => {
  const bal2 = 100 - num(cfg(p, "deposit", company));
  const L: string[] = [];
  L.push("Σ  ARTYMER — 贸易保障合同条款");
  L.push(
    `订单：${V(p.name)} / ${V(acctName(p, accounts))}   数量：${V(p.qty)} 件   单价 ${V(p.unitPrice)} ${p.currency}   版本 ${V(p.rev)}`,
  );
  L.push(`质量以所附《生产规格书》（版本 ${V(p.rev)}）及批准的首件样品为准，`);
  L.push("二者均为本合同的组成部分。", RULE);
  L.push("1. 权责与授权");
  L.push("   • Artymer 拥有唯一的设计与质量权责：图稿、CAD、公差、批准的首件");
  L.push("     样品及最终品控签收。未经 Artymer 事先书面批准，不得替换部件或");
  L.push("     偏离规格。");
  L.push("   • 供应商须严格按本规格书及批准样品制造，并对制造缺陷、不合格");
  L.push("     材料及任何未申报的部件替换承担全部责任。");
  L.push("   • 仅限原装正品部件；假冒或未经授权的部件使该批失去接收资格，");
  L.push("     由此产生的全部成本与责任由供应商承担。", RULE);
  L.push("2. 付款");
  L.push(`   • 下单 + 样品批准时支付 ${V(cfg(p, "deposit", company))}% 定金；买方批准出货前品控影像后`);
  L.push(`     支付余款 ${bal2}%，于出货前付清。`);
  L.push("   • 所有款项经 Alibaba.com 指定渠道支付 —— 仅经渠道支付的金额受保护。");
  L.push("   • 定金用于模具 + 材料；模具开切后买方取消订单的，定金不予退还。", RULE);
  L.push("3. 合格标准");
  L.push("   仅当每一项可测量参数均在规格书公差内，且在 5000–6500 K 光源下");
  L.push("   与批准样品一致时，方为合格。");
  L.push(`   机芯须为原装 ${V(p.cal)}，并于装壳前以底板微距证明。`, RULE);
  L.push("4. 拒收");
  L.push("   • 单件：超出公差，或目视明显偏离批准样品。");
  L.push(`   • 批次：不合格率 > ${V(cfg(p, "lotFail", company))}% 时，整批可被拒收。`);
  L.push(`   • 供应商自费返工/更换或全额退款；最多 ${V(cfg(p, "rework", company))} 次返工。`);
  L.push("   • 出货前已有不合格证据 = 不出货、不放余款。", RULE);
  L.push("5. 运输与退货");
  L.push("   • 已出货的不合格品：供应商承担 100% 退运运费，并更换或全额退款。");
  L.push("   • 当退货相对订单价值不切实际时，凭不合格证据免退货退款。", RULE);
  L.push("6. 品控影像（放行节点）");
  L.push("   连续未剪辑视频；订单 + 日期纸；全批清点；逐件编号微距；");
  L.push("   装壳前机芯片段；中性光源；逐件静态照片。");
  L.push(`   余款放行前交付。买方在 ${V(cfg(p, "window", company))} 个工作日内批准/拒收。`, RULE);
  L.push("7. 争议");
  L.push("   以规格书 + 批准样品 + 品控影像为依据。在贸易保障时限内");
  L.push("   （5 日响应 / 15 日解决）未能解决的 → 买方升级至 Alibaba.com。");
  return L.join("\n");
};

export const qcSignoffZh = (p: Project, accounts: AccountMap, company: Company): string => {
  const vv = projVerdict(p, company);
  return `Σ ARTYMER — 品控签收
订单：${V(p.name)} / ${V(acctName(p, accounts))}   版本 ${V(p.rev)}   ${p.qc.signedDate || today()}
已对照规格书 + 批准样品检验 ${V(p.qty)} 件中的 ${vv.passU + vv.failU} 件。
合格：${vv.passU}   不合格：${vv.failU}   不良率：${vv.failRate.toFixed(1)}%（批次阈值 ${V(cfg(p, "lotFail", company))}%）
判定：${VERDICT_ZH[vv.verdict] || vv.verdict}
由 Artymer 检验并签收 —— 制表师与创始人。`;
};
