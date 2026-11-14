/* ===== CURSOR GHOST =====
   6 cópias da seta que seguem o ponteiro, cada uma atrasando e borrando mais.
   O cursor nativo continua visível (nenhum "cursor: none" em lugar nenhum).
   Só monta com mouse (hover + pointer fino) e sem prefers-reduced-motion. */
(() => {
  const GHOSTS = 6;      // cópias
  const SIZE = 26;       // altura da seta em px
  const HEAD_FOLLOW = 0.26; // quanto a 1ª cópia anda a cada frame em direção ao ponteiro
  const SMEAR = 5;       // blur máximo (px), da última cópia
  // a cor (#FFFFFF) fica em css/efeitos.css, na variável --ghost-fill

  const mqPointer = matchMedia("(hover: hover) and (pointer: fine)");
  const mqMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Seta com a ponta em (0,0); o viewBox deixa uma folga para o contorno
  const VB = { x: -1.5, y: -1.5, w: 15.5, h: 22 };
  const ARROW = "M0 0 L0 17 L4.3 13.2 L7 19.5 L9.4 18.4 L6.8 12.2 L12.5 12.2 Z";
  const scale = SIZE / VB.h;
  const arrowW = VB.w * scale;
  const tipOffset = -VB.x * scale; // distância da ponta até a borda do svg

  let layer = null;
  let arrows = [];
  let gx = [];
  let gy = [];
  let px = 0;
  let py = 0;
  let raf = 0;
  let needsSnap = true;

  function build() {
    layer = document.createElement("div");
    layer.className = "cursor-ghost";
    layer.setAttribute("aria-hidden", "true");

    arrows = [];
    for (let i = 0; i < GHOSTS; i++) {
      const el = document.createElement("div");
      el.className = "cursor-ghost__arrow";
      el.style.width = arrowW + "px";
      el.style.height = SIZE + "px";
      el.style.filter = `blur(${((SMEAR * (i + 1)) / GHOSTS).toFixed(2)}px)`;
      el.innerHTML =
        `<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${arrowW}" height="${SIZE}" focusable="false">` +
        `<path d="${ARROW}"/></svg>`;
      layer.appendChild(el);
      arrows.push(el);
    }
    gx = new Array(GHOSTS).fill(0);
    gy = new Array(GHOSTS).fill(0);
    document.body.appendChild(layer);
  }

  function tick() {
    raf = 0;
    let moving = false;
    let prevX = px;
    let prevY = py;

    for (let i = 0; i < GHOSTS; i++) {
      // cada cópia persegue a anterior, e cada uma é mais "preguiçosa"
      const k = HEAD_FOLLOW * (1 - 0.13 * i);
      gx[i] += (prevX - gx[i]) * k;
      gy[i] += (prevY - gy[i]) * k;
      prevX = gx[i];
      prevY = gy[i];

      // some em repouso: opacidade * min(1, distância ÷ (size × 0.5))
      const dist = Math.hypot(px - gx[i], py - gy[i]);
      const fade = Math.min(1, dist / (SIZE * 0.5));
      const base = 0.8 - i * 0.11;

      arrows[i].style.opacity = (base * fade).toFixed(3);
      arrows[i].style.transform =
        `translate3d(${(gx[i] - tipOffset).toFixed(2)}px, ${(gy[i] - tipOffset).toFixed(2)}px, 0)`;

      if (dist > 0.1) moving = true;
    }

    // para o loop quando tudo assentou; o próximo movimento reinicia
    if (moving) raf = requestAnimationFrame(tick);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    px = e.clientX;
    py = e.clientY;
    if (needsSnap) {
      gx.fill(px);
      gy.fill(py);
      needsSnap = false;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function onLeave() {
    needsSnap = true; // ao voltar para a janela, as cópias não "voam" do ponto antigo
    arrows.forEach((a) => (a.style.opacity = "0"));
  }

  function mount() {
    if (layer) return;
    build();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
  }

  function unmount() {
    if (!layer) return;
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("mouseleave", onLeave);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    layer.remove();
    layer = null;
    arrows = [];
    needsSnap = true;
  }

  function sync() {
    const ok = mqPointer.matches && !mqMotion.matches;
    if (ok) mount();
    else unmount();
  }

  mqPointer.addEventListener("change", sync);
  mqMotion.addEventListener("change", sync);
  window.addEventListener("pagehide", unmount);
  window.addEventListener("pageshow", sync);
  sync();
})();