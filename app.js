console.log("CTI IA DSS APP");


/* CTI_IA_DSS_V10_ABCD_FINAL_PATCH */
window.CTI_IA_DSS_ABCD_RULES = {
  A: "Misma decisión conceptual: mejora por menor Ldec; Tint igual.",
  B: "Decisión diferente: menor Tint y menor Ttotal.",
  C: "Decisión diferente: mayor Tint pero Ttotal menor/igual por menor Ldec.",
  D: "Decisión diferente: Ttotal mayor pero decisión más segura/robusta."
};

window.CTI_IA_DSS_CLASSIFY_SCENARIO = function(decisionEquivalent, tintBase, tintProp, totalBase, totalProp) {
  const eq = String(decisionEquivalent || "").trim().toLowerCase();
  const same = eq === "sí" || eq === "si" || eq === "yes" || eq === "true" || eq === "1";
  const tb = Number(tintBase);
  const tp = Number(tintProp);
  const tob = Number(totalBase);
  const top = Number(totalProp);
  if (same) return "A";
  if (!same && tp < tb && top < tob) return "B";
  if (!same && tp > tb && top <= tob) return "C";
  if (!same && top > tob) return "D";
  return "Revisar";
};
