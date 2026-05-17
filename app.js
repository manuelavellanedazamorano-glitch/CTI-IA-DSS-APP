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



/* CTI IA DSS V12 ANALISIS METODOLOGICO */
window.CTI_IA_DSS_ANALISIS = {
  distribucion: {A:37,B:46,C:12,D:5},
  descripcion: {
    A: "Misma decisión conceptual; mejora por menor Ldec y Tint equivalente.",
    B: "Decisión diferente con menor Tint y menor Ttotal.",
    C: "Decisión diferente con Tint mayor pero Ttotal menor o equivalente gracias a menor Ldec.",
    D: "Decisión diferente orientada a mayor seguridad/robustez aunque Ttotal aumente."
  },
  metricas: {
    ldecBase: 22.26,
    ldecProp: 8.50,
    ttotalBase: 73.34,
    ttotalProp: 51.73
  }
};

window.renderAnalisisMetodologicoABCD = function() {
  const data = window.CTI_IA_DSS_ANALISIS;
  const html = `
    <section class="card metodologia-abcd">
      <h2>📊 Análisis metodológico A/B/C/D</h2>

      <div class="grid grid-4">
        <div class="metric-card"><strong>A</strong><br>${data.distribucion.A} casos</div>
        <div class="metric-card"><strong>B</strong><br>${data.distribucion.B} casos</div>
        <div class="metric-card"><strong>C</strong><br>${data.distribucion.C} casos</div>
        <div class="metric-card"><strong>D</strong><br>${data.distribucion.D} casos</div>
      </div>

      <ul style="margin-top:12px">
        <li><strong>A:</strong> ${data.descripcion.A}</li>
        <li><strong>B:</strong> ${data.descripcion.B}</li>
        <li><strong>C:</strong> ${data.descripcion.C}</li>
        <li><strong>D:</strong> ${data.descripcion.D}</li>
      </ul>

      <h3 style="margin-top:18px">Métricas globales</h3>
      <ul>
        <li>Ldec base medio: ${data.metricas.ldecBase} min</li>
        <li>Ldec propuesto medio: ${data.metricas.ldecProp} min</li>
        <li>Ttotal base medio: ${data.metricas.ttotalBase} min</li>
        <li>Ttotal propuesto medio: ${data.metricas.ttotalProp} min</li>
      </ul>
    </section>
  `;

  const existing = document.getElementById("analisis-metodologico-abcd");
  if(existing){
    existing.innerHTML = html;
  } else {
    const div = document.createElement("div");
    div.id = "analisis-metodologico-abcd";
    div.innerHTML = html;
    document.body.appendChild(div);
  }
};

window.addEventListener("load", () => {
  setTimeout(() => {
    try { window.renderAnalisisMetodologicoABCD(); } catch(e){}
  }, 500);
});
