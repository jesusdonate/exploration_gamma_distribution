(function () {
  const canvas = document.getElementById("gammaCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const alphaRange = document.getElementById("alphaRange");
  const betaRange = document.getElementById("betaRange");
  const alphaInput = document.getElementById("alphaInput");
  const betaInput = document.getElementById("betaInput");
  const xMinInput = document.getElementById("xMin");
  const xMaxInput = document.getElementById("xMax");
  const areaResult = document.getElementById("areaResult");

  if (!ctx || !alphaRange || !betaRange || !alphaInput || !betaInput || !xMinInput || !xMaxInput || !areaResult) {
    return;
  }

  const EPS = 1e-4;
  const MARGIN = { left: 68, right: 26, top: 40, bottom: 56 };
  let state = {
    alpha: 2,
    beta: 2,
    xLower: 1,
    xUpper: 5
  };
  let graph = { xMax: 10, yMax: 1, points: [] };

  function clampNonNegative(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
  }

  function readState() {
    state.alpha = clampNonNegative(Number(alphaInput.value || alphaRange.value));
    state.beta = clampNonNegative(Number(betaInput.value || betaRange.value));
    state.xLower = Math.max(0, Number(xMinInput.value || 0));
    state.xUpper = Math.max(0, Number(xMaxInput.value || 0));

    if (state.xLower > state.xUpper) {
      const swap = state.xLower;
      state.xLower = state.xUpper;
      state.xUpper = swap;
    }

    alphaInput.value = String(state.alpha);
    betaInput.value = String(state.beta);
    alphaRange.value = String(state.alpha);
    betaRange.value = String(state.beta);
    xMinInput.value = String(state.xLower);
    xMaxInput.value = String(state.xUpper);
  }

  function gammaLn(z) {
    const p = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (z < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - gammaLn(1 - z);
    }

    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < p.length; i += 1) {
      x += p[i] / (z + i + 1);
    }
    const t = z + p.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function gammaPdf(x, alpha, beta) {
    if (x <= 0 || alpha <= 0 || beta <= 0) return 0;
    const logPdf =
      (alpha - 1) * Math.log(x) -
      x / beta -
      gammaLn(alpha) -
      alpha * Math.log(beta);
    return Math.exp(logPdf);
  }

  function integratePdf(alpha, beta, lower, upper) {
    if (upper <= lower) return 0;
    const n = 1200;
    const h = (upper - lower) / n;
    let sum = gammaPdf(lower + EPS, alpha, beta) + gammaPdf(upper, alpha, beta);

    for (let i = 1; i < n; i += 1) {
      const x = lower + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * gammaPdf(x, alpha, beta);
    }
    return (h / 3) * sum;
  }

  function buildPoints(alpha, beta) {
    const mean = alpha * beta;
    const sd = Math.sqrt(alpha) * beta;
    const xMax = Math.max(10, mean + 6 * sd, state.xUpper + 2);
    const samples = 650;
    const points = [];
    let yMax = 0;

    for (let i = 0; i <= samples; i += 1) {
      const x = (i / samples) * xMax;
      const y = gammaPdf(x + EPS, alpha, beta);
      points.push({ x, y });
      if (y > yMax) yMax = y;
    }

    return { xMax, yMax: Math.max(yMax * 1.18, 0.2), points };
  }

  function xToPx(x) {
    const plotWidth = canvas.width - MARGIN.left - MARGIN.right;
    return MARGIN.left + (x / graph.xMax) * plotWidth;
  }

  function yToPx(y) {
    const plotHeight = canvas.height - MARGIN.top - MARGIN.bottom;
    return canvas.height - MARGIN.bottom - (y / graph.yMax) * plotHeight;
  }

  function drawAxes() {
    ctx.strokeStyle = "rgba(213, 225, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, MARGIN.top);
    ctx.lineTo(MARGIN.left, canvas.height - MARGIN.bottom);
    ctx.lineTo(canvas.width - MARGIN.right, canvas.height - MARGIN.bottom);
    ctx.stroke();

    ctx.fillStyle = "#d9e4ff";
    ctx.font = "14px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("f(x)", MARGIN.left, MARGIN.top - 8);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("x", canvas.width - MARGIN.right + 8, canvas.height - MARGIN.bottom + 4);

    ctx.fillStyle = "rgba(218, 228, 255, 0.7)";
    ctx.font = "12px Segoe UI";
    const xTicks = 6;
    for (let i = 0; i <= xTicks; i += 1) {
      const xVal = (graph.xMax * i) / xTicks;
      const px = xToPx(xVal);
      ctx.beginPath();
      ctx.moveTo(px, canvas.height - MARGIN.bottom);
      ctx.lineTo(px, canvas.height - MARGIN.bottom + 5);
      ctx.stroke();
      ctx.fillText(xVal.toFixed(1), px - 12, canvas.height - MARGIN.bottom + 20);
    }

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i += 1) {
      const yVal = (graph.yMax * i) / yTicks;
      const py = yToPx(yVal);
      ctx.beginPath();
      ctx.moveTo(MARGIN.left - 5, py);
      ctx.lineTo(MARGIN.left, py);
      ctx.stroke();
      ctx.fillText(yVal.toFixed(3), MARGIN.left - 52, py + 4);
    }
  }

  function shadeInterval() {
    const left = Math.max(0, state.xLower);
    const right = Math.min(graph.xMax, state.xUpper);
    if (right <= left) return;

    ctx.fillStyle = "rgba(124, 156, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(xToPx(left), yToPx(0));
    for (const p of graph.points) {
      if (p.x >= left && p.x <= right) {
        ctx.lineTo(xToPx(p.x), yToPx(p.y));
      }
    }
    ctx.lineTo(xToPx(right), yToPx(gammaPdf(right + EPS, state.alpha, state.beta)));
    ctx.lineTo(xToPx(right), yToPx(0));
    ctx.closePath();
    ctx.fill();
  }

  function drawCurve() {
    ctx.strokeStyle = "#83a2ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    graph.points.forEach((p, i) => {
      const px = xToPx(p.x);
      const py = yToPx(p.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();
  }

  function render() {
    readState();
    graph = buildPoints(state.alpha, state.beta);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    shadeInterval();
    drawCurve();

    const area = integratePdf(state.alpha, state.beta, state.xLower, state.xUpper);
    areaResult.textContent = `Probability that X is between ${state.xLower.toFixed(2)} and ${state.xUpper.toFixed(2)}] is ${(area* 100).toFixed(2)}%`;
  }

  function bindLinkedInputs(range, number) {
    range.addEventListener("input", () => {
      number.value = range.value;
      render();
    });
    number.addEventListener("input", () => {
      range.value = number.value;
      render();
    });
  }

  bindLinkedInputs(alphaRange, alphaInput);
  bindLinkedInputs(betaRange, betaInput);
  xMinInput.addEventListener("input", render);
  xMaxInput.addEventListener("input", render);

  render();
})();
