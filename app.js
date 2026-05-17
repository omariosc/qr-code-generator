(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    url: $("url"),
    size: $("size"), sizeVal: $("size-val"),
    margin: $("margin"), marginVal: $("margin-val"),
    ecl: $("ecl"), format: $("format"),
    fg: $("fg"), fgGradient: $("fg-gradient"),
    fgColor2: $("fg-color2"), fgGtype: $("fg-gtype"),
    fgRotation: $("fg-rotation"), fgRotVal: $("fg-rot-val"),
    bg: $("bg"), bgTransparent: $("bg-transparent"), bgGradient: $("bg-gradient"),
    bgColor2: $("bg-color2"), bgGtype: $("bg-gtype"),
    bgRotation: $("bg-rotation"), bgRotVal: $("bg-rot-val"),
    dotStyle: $("dot-style"), cornerSq: $("corner-sq"), cornerDot: $("corner-dot"),
    logo: $("logo"), logoClear: $("logo-clear"), logoName: $("logo-name"),
    logoSize: $("logo-size"), logoSizeVal: $("logo-size-val"),
    logoMargin: $("logo-margin"), logoMarginVal: $("logo-margin-val"),
    logoHideDots: $("logo-hide-dots"),
    preview: $("preview"), download: $("download"),
    reset: $("reset"),
  };

  const defaults = {
    fg: "#1d1d1f", bg: "#ffffff", fgColor2: "#6e6e73", bgColor2: "#f5f5f7",
    size: 320, margin: 8, ecl: "H", format: "png",
    dotStyle: "square", cornerSq: "square", cornerDot: "square",
    fgRotation: 0, bgRotation: 0, fgGtype: "linear", bgGtype: "linear",
    logoSize: 40, logoMargin: 8, logoHideDots: true,
  };

  const STORAGE_KEY = "qr-studio-settings-v1";
  let engine = "styled";
  let logoDataUrl = null;
  let styledQR = null;

  function saveState() {
    const s = {
      url: els.url.value, engine,
      size: els.size.value, margin: els.margin.value,
      ecl: els.ecl.value, format: els.format.value,
      fg: els.fg.value, fgColor2: els.fgColor2.value,
      fgGradient: els.fgGradient.checked,
      fgGtype: els.fgGtype.value, fgRotation: els.fgRotation.value,
      bg: els.bg.value, bgColor2: els.bgColor2.value,
      bgGradient: els.bgGradient.checked, bgTransparent: els.bgTransparent.checked,
      bgGtype: els.bgGtype.value, bgRotation: els.bgRotation.value,
      dotStyle: els.dotStyle.value, cornerSq: els.cornerSq.value, cornerDot: els.cornerDot.value,
      logoSize: els.logoSize.value, logoMargin: els.logoMargin.value,
      logoHideDots: els.logoHideDots.checked,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) { /* private mode / quota */ }
  }

  function loadState() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) { return false; }
    if (!raw) return false;
    let s;
    try { s = JSON.parse(raw); } catch (_) { return false; }
    const setVal = (el, v) => { if (el && v !== undefined && v !== null) el.value = v; };
    const setChk = (el, v) => { if (el && typeof v === "boolean") el.checked = v; };
    const setText = (el, txt) => { if (el && txt !== undefined && txt !== null) el.textContent = txt; };

    setVal(els.url, s.url);
    setVal(els.size, s.size); setText(els.sizeVal, s.size);
    setVal(els.margin, s.margin); setText(els.marginVal, s.margin);
    setVal(els.ecl, s.ecl); setVal(els.format, s.format);
    setVal(els.fg, s.fg); setVal(els.fgColor2, s.fgColor2);
    setChk(els.fgGradient, s.fgGradient);
    setVal(els.fgGtype, s.fgGtype);
    setVal(els.fgRotation, s.fgRotation); setText(els.fgRotVal, s.fgRotation !== undefined ? s.fgRotation + "°" : undefined);
    setVal(els.bg, s.bg); setVal(els.bgColor2, s.bgColor2);
    setChk(els.bgGradient, s.bgGradient); setChk(els.bgTransparent, s.bgTransparent);
    setVal(els.bgGtype, s.bgGtype);
    setVal(els.bgRotation, s.bgRotation); setText(els.bgRotVal, s.bgRotation !== undefined ? s.bgRotation + "°" : undefined);
    setVal(els.dotStyle, s.dotStyle); setVal(els.cornerSq, s.cornerSq); setVal(els.cornerDot, s.cornerDot);
    setVal(els.logoSize, s.logoSize); setText(els.logoSizeVal, s.logoSize !== undefined ? s.logoSize + "%" : undefined);
    setVal(els.logoMargin, s.logoMargin); setText(els.logoMarginVal, s.logoMargin);
    setChk(els.logoHideDots, s.logoHideDots);
    if (s.engine === "simple" || s.engine === "styled") engine = s.engine;
    return true;
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function setEngine(name) {
    engine = name;
    document.body.dataset.engineMode = name;
    document.querySelectorAll("[data-engine]").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.engine === name));
    });
    [...els.format.options].forEach((opt) => {
      if (opt.hasAttribute("data-styled-only")) {
        opt.disabled = name !== "styled";
        if (opt.disabled && opt.selected) els.format.value = "png";
      }
    });
    styledQR = null;
    render();
  }

  function syncGradientControls(prefix) {
    const toggle = $(`${prefix}-gradient`);
    const controls = document.querySelector(`.gradient-controls[data-for="${prefix}"]`);
    if (controls) controls.hidden = !toggle.checked;
  }

  function getStyledConfig(data) {
    const size = +els.size.value;
    const margin = +els.margin.value;

    const fgGrad = els.fgGradient.checked ? {
      type: els.fgGtype.value,
      rotation: (+els.fgRotation.value) * Math.PI / 180,
      colorStops: [
        { offset: 0, color: els.fg.value },
        { offset: 1, color: els.fgColor2.value },
      ],
    } : null;

    let bgColorOpt;
    if (els.bgTransparent.checked) {
      bgColorOpt = { color: "rgba(0,0,0,0)" };
    } else if (els.bgGradient.checked) {
      bgColorOpt = {
        gradient: {
          type: els.bgGtype.value,
          rotation: (+els.bgRotation.value) * Math.PI / 180,
          colorStops: [
            { offset: 0, color: els.bg.value },
            { offset: 1, color: els.bgColor2.value },
          ],
        },
      };
    } else {
      bgColorOpt = { color: els.bg.value };
    }

    const dotsOpt = { type: els.dotStyle.value, color: els.fg.value };
    if (fgGrad) dotsOpt.gradient = fgGrad;
    const sqOpt = { type: els.cornerSq.value, color: els.fg.value };
    if (fgGrad) sqOpt.gradient = fgGrad;
    const dotOpt = { type: els.cornerDot.value, color: els.fg.value };
    if (fgGrad) dotOpt.gradient = fgGrad;

    const cfg = {
      width: size,
      height: size,
      data,
      margin,
      type: els.format.value === "svg" ? "svg" : "canvas",
      qrOptions: { errorCorrectionLevel: els.ecl.value },
      dotsOptions: dotsOpt,
      backgroundOptions: bgColorOpt,
      cornersSquareOptions: sqOpt,
      cornersDotOptions: dotOpt,
      imageOptions: {
        hideBackgroundDots: els.logoHideDots.checked,
        imageSize: (+els.logoSize.value) / 100,
        margin: +els.logoMargin.value,
        crossOrigin: "anonymous",
      },
    };
    if (logoDataUrl) cfg.image = logoDataUrl;
    return cfg;
  }

  function getSimpleOptions() {
    return {
      errorCorrectionLevel: els.ecl.value,
      margin: Math.max(0, Math.round((+els.margin.value) / 4)),
      width: +els.size.value,
      color: {
        dark: els.fg.value,
        light: els.bgTransparent.checked ? "#0000" : els.bg.value,
      },
    };
  }

  function renderStyled(data) {
    if (typeof QRCodeStyling === "undefined") {
      els.preview.textContent = "Loading qr-code-styling…";
      return;
    }
    const cfg = getStyledConfig(data);
    styledQR = new QRCodeStyling(cfg);
    els.preview.replaceChildren();
    styledQR.append(els.preview);
  }

  async function renderSimple(data) {
    if (typeof QRCode === "undefined") {
      els.preview.textContent = "Loading qrcode…";
      return;
    }
    const opts = getSimpleOptions();
    els.preview.replaceChildren();
    if (els.format.value === "svg") {
      const svgText = await QRCode.toString(data, { ...opts, type: "svg" });
      const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const svgEl = doc.documentElement;
      if (svgEl && svgEl.nodeName.toLowerCase() === "svg" && !doc.querySelector("parsererror")) {
        els.preview.appendChild(document.importNode(svgEl, true));
      } else {
        els.preview.textContent = "Could not parse SVG output.";
      }
    } else {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, data, opts);
      els.preview.appendChild(canvas);
    }
  }

  let renderTimer;
  function render() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(async () => {
      saveState();
      const data = els.url.value || " ";
      try {
        if (engine === "styled") {
          renderStyled(data);
        } else {
          styledQR = null;
          await renderSimple(data);
        }
      } catch (err) {
        console.error(err);
        els.preview.textContent = "Could not render: " + (err.message || err);
      }
    }, 120);
  }

  async function download() {
    const fmt = els.format.value;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = `qr-${stamp}`;

    if (engine === "styled" && styledQR) {
      await styledQR.download({ name, extension: fmt });
      return;
    }

    const data = els.url.value || " ";
    const opts = getSimpleOptions();
    let href, ext;
    if (fmt === "svg") {
      const svg = await QRCode.toString(data, { ...opts, type: "svg" });
      href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      ext = "svg";
    } else {
      href = await QRCode.toDataURL(data, opts);
      ext = "png";
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function resetForm() {
    els.fg.value = defaults.fg;
    els.bg.value = defaults.bg;
    els.fgColor2.value = defaults.fgColor2;
    els.bgColor2.value = defaults.bgColor2;
    els.fgGradient.checked = false;
    els.bgGradient.checked = false;
    els.bgTransparent.checked = false;
    els.logoHideDots.checked = defaults.logoHideDots;
    els.size.value = defaults.size; els.sizeVal.textContent = defaults.size;
    els.margin.value = defaults.margin; els.marginVal.textContent = defaults.margin;
    els.ecl.value = defaults.ecl;
    els.format.value = defaults.format;
    els.dotStyle.value = defaults.dotStyle;
    els.cornerSq.value = defaults.cornerSq;
    els.cornerDot.value = defaults.cornerDot;
    els.fgGtype.value = defaults.fgGtype;
    els.bgGtype.value = defaults.bgGtype;
    els.fgRotation.value = defaults.fgRotation; els.fgRotVal.textContent = defaults.fgRotation + "°";
    els.bgRotation.value = defaults.bgRotation; els.bgRotVal.textContent = defaults.bgRotation + "°";
    els.logoSize.value = defaults.logoSize; els.logoSizeVal.textContent = defaults.logoSize + "%";
    els.logoMargin.value = defaults.logoMargin; els.logoMarginVal.textContent = defaults.logoMargin;
    logoDataUrl = null;
    els.logo.value = "";
    els.logoClear.hidden = true;
    els.logoName.textContent = "";
    clearState();
    syncGradientControls("fg");
    syncGradientControls("bg");
    render();
  }

  function bindSlider(input, val, suffix = "") {
    if (!input || !val) return;
    const update = () => { val.textContent = input.value + suffix; render(); };
    input.addEventListener("input", update);
    val.textContent = input.value + suffix;
  }

  function bind() {
    document.querySelectorAll("[data-engine]").forEach((b) => {
      b.addEventListener("click", () => setEngine(b.dataset.engine));
    });

    bindSlider(els.size, els.sizeVal);
    bindSlider(els.margin, els.marginVal);
    bindSlider(els.fgRotation, els.fgRotVal, "°");
    bindSlider(els.bgRotation, els.bgRotVal, "°");
    bindSlider(els.logoSize, els.logoSizeVal, "%");
    bindSlider(els.logoMargin, els.logoMarginVal);

    [
      els.url, els.ecl, els.format, els.fg, els.bg, els.bgTransparent,
      els.fgGradient, els.bgGradient, els.fgColor2, els.bgColor2,
      els.fgGtype, els.bgGtype,
      els.dotStyle, els.cornerSq, els.cornerDot,
      els.logoHideDots,
    ].forEach((el) => el && el.addEventListener("input", render));

    els.fgGradient.addEventListener("change", () => syncGradientControls("fg"));
    els.bgGradient.addEventListener("change", () => syncGradientControls("bg"));

    els.logo.addEventListener("change", () => {
      const file = els.logo.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        logoDataUrl = e.target.result;
        els.logoClear.hidden = false;
        els.logoName.textContent = file.name.length > 24 ? file.name.slice(0, 22) + "…" : file.name;
        render();
      };
      reader.readAsDataURL(file);
    });

    els.logoClear.addEventListener("click", () => {
      logoDataUrl = null;
      els.logo.value = "";
      els.logoClear.hidden = true;
      els.logoName.textContent = "";
      render();
    });

    els.download.addEventListener("click", download);
    els.reset.addEventListener("click", resetForm);
  }

  function waitForLibs(cb) {
    if (typeof QRCodeStyling !== "undefined" && typeof QRCode !== "undefined") {
      cb();
    } else {
      setTimeout(() => waitForLibs(cb), 50);
    }
  }

  function init() {
    bind();
    const restored = loadState();
    setEngine(restored ? engine : "styled");
    syncGradientControls("fg");
    syncGradientControls("bg");
    waitForLibs(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
