/* ===== CARROSSEL DE PROJETOS =====
   Trilho com scroll-snap (funciona com toque, mouse e teclado) + setas + bolinhas.
   Quantos cards aparecem por vez vem do CSS (--por-vista), então basta mexer lá. */
(() => {
  const root = document.querySelector("[data-carrossel]");
  if (!root) return;

  const track = root.querySelector(".carrossel-track");
  const items = Array.from(track.children);
  const prev = root.querySelector("[data-prev]");
  const next = root.querySelector("[data-next]");
  const dotsBox = root.querySelector("[data-dots]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  let step = 0;   // largura de um card + espaço
  let max = 0;    // último índice possível de "primeiro card visível"
  let dots = [];
  let ticking = false;

  const clamp = (n) => Math.min(max, Math.max(0, n));
  const current = () => clamp(Math.round(track.scrollLeft / step));

  function measure() {
    step = items.length > 1
      ? items[1].offsetLeft - items[0].offsetLeft
      : items[0].offsetWidth;
    const perView = parseInt(getComputedStyle(root).getPropertyValue("--por-vista"), 10) || 1;
    max = Math.max(0, items.length - perView);

    dotsBox.innerHTML = "";
    dots = [];
    for (let i = 0; i <= max; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "carrossel-dot";
      b.setAttribute("aria-label", `Ir para o projeto ${i + 1}`);
      b.addEventListener("click", () => go(i));
      dotsBox.appendChild(b);
      dots.push(b);
    }
    dotsBox.hidden = max === 0;
    update();
  }

  function go(i) {
    track.scrollTo({
      left: clamp(i) * step,
      behavior: reduce.matches ? "auto" : "smooth",
    });
  }

  function update() {
    ticking = false;
    const i = current();
    dots.forEach((d, n) => {
      if (n === i) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    prev.disabled = atStart;
    next.disabled = atEnd;
  }

  prev.addEventListener("click", () => go(current() - 1));
  next.addEventListener("click", () => go(current() + 1));

  track.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  // setas do teclado quando o trilho está focado
  track.addEventListener("keydown", (e) => {
    if (e.target !== track) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(current() + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current() - 1); }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  });

  measure();
})();