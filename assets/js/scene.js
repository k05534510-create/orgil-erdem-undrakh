/* ОЭУ ХХК — SITE-WIDE 3D WORLD (Three.js r128) — high-quality pass
   Fixed full-page canvas behind all content; scroll flies the camera through:
   a snow-capped green summit, a jewel gold compass-star with a glow halo, and
   9 CLICKABLE gold ISO coins (click → that standard's popup). ACES tone-mapping,
   2x pixel ratio, procedural env reflections. Graceful fallback + reduced motion.
   Plus pointer tilt on cards.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var STANDARDS = ["ISO 9001", "ISO 14001", "ISO 45001", "ISO 50001", "ISO 22000", "GMP", "GHP", "ESRS", "GRI"];

  /* ---------- procedural environment map (gold reflections) ---------- */
  function makeEnvTexture(renderer) {
    var c = document.createElement("canvas"); c.width = 64; c.height = 256;
    var g = c.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.0, "#243f30");
    grd.addColorStop(0.4, "#0a201a");
    grd.addColorStop(0.55, "#e9c878");   // warm specular band
    grd.addColorStop(0.6, "#fff1cf");    // hot highlight
    grd.addColorStop(0.66, "#caa24f");
    grd.addColorStop(0.85, "#0c2620");
    grd.addColorStop(1.0, "#05120d");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
    // a soft bright blob for a believable key reflection
    var rb = g.createRadialGradient(44, 150, 2, 44, 150, 30);
    rb.addColorStop(0, "rgba(255,245,220,0.9)"); rb.addColorStop(1, "rgba(255,245,220,0)");
    g.fillStyle = rb; g.fillRect(0, 110, 64, 80);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var rt = pmrem.fromEquirectangular(tex);
    tex.dispose();
    return rt.texture;
  }

  function radialSprite(stops) {
    var s = 128, c = document.createElement("canvas"); c.width = c.height = s;
    var g = c.getContext("2d"); var grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    stops.forEach(function (st) { grd.addColorStop(st[0], st[1]); });
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- terrain height ---------- */
  function height(x, z) {
    var v = 0;
    v += 1.7 * Math.sin(x * 0.20 + 1.0) * Math.cos(z * 0.18 + 0.5);
    v += 0.95 * Math.sin(x * 0.46 + 3.0) * Math.cos(z * 0.37 + 1.7);
    v += 0.5 * Math.sin(x * 0.95 + 0.3) * Math.cos(z * 0.80 + 2.2);
    var dx = x - 4, dz = z + 2; v += 8.2 * Math.exp(-(dx * dx + dz * dz) / 46);
    var ex = x + 11, ez = z + 6; v += 3.2 * Math.exp(-(ex * ex + ez * ez) / 60);
    return v;
  }

  function makeMountain() {
    var geo = new THREE.PlaneGeometry(78, 60, 168, 128);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var cLow = new THREE.Color(0x0e2c20), cMid = new THREE.Color(0x2d5d40),
        cHi = new THREE.Color(0xb89a52), cSnow = new THREE.Color(0xe9e4d6);
    var col = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var h = height(pos.getX(i), pos.getY(i)); pos.setZ(i, h);
      var t = clamp(h / 8.6, 0, 1);
      if (t < 0.45) col.copy(cLow).lerp(cMid, t / 0.45);
      else if (t < 0.78) col.copy(cMid).lerp(cHi, (t - 0.45) / 0.33);
      else col.copy(cHi).lerp(cSnow, (t - 0.78) / 0.22);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.08 }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, -7.8, -9);
    return mesh;
  }

  function makeStarGeometry() {
    var shape = new THREE.Shape(); var spikes = 8, outer = 3.5, inner = 1.34;
    for (var i = 0; i < spikes * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner, a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.26, bevelSize: 0.26, bevelSegments: 8, steps: 2 });
    geo.center(); geo.computeVertexNormals(); return geo;
  }

  /* ---------- gold ISO coin face texture ---------- */
  function coinTexture(code) {
    var s = 1024, c = document.createElement("canvas"); c.width = c.height = s; var g = c.getContext("2d");
    var rg = g.createRadialGradient(s * 0.40, s * 0.36, s * 0.08, s / 2, s / 2, s * 0.55);
    rg.addColorStop(0, "#f6dca0"); rg.addColorStop(0.45, "#d2ac5a"); rg.addColorStop(1, "#8a6a2c");
    g.fillStyle = rg; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - s * 0.01, 0, 7); g.fill();
    g.lineWidth = s * 0.037; g.strokeStyle = "rgba(86,62,22,0.65)"; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - s * 0.05, 0, 7); g.stroke();
    g.lineWidth = s * 0.012; g.strokeStyle = "rgba(255,240,205,0.55)"; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - s * 0.081, 0, 7); g.stroke();
    g.fillStyle = "#3c2d0d"; g.textAlign = "center"; g.textBaseline = "middle";
    var parts = code.split(" ");
    if (parts.length === 2) {
      g.font = "bold " + (s * 0.19).toFixed(0) + "px Arial, sans-serif"; g.fillText(parts[0], s / 2, s / 2 - s * 0.112);
      g.font = "bold " + (s * 0.245).toFixed(0) + "px Arial, sans-serif"; g.fillText(parts[1], s / 2, s / 2 + s * 0.125);
    } else { g.font = "bold " + (s * 0.27).toFixed(0) + "px Arial, sans-serif"; g.fillText(code, s / 2, s / 2); }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 16; return t;
  }

  function initWorld() {
    if (typeof THREE === "undefined") return;
    var canvas = document.getElementById("bgCanvas"); if (!canvas) return;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); } catch (e) { return; }
    var lite = (window.matchMedia("(max-width: 820px)").matches || window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
    document.body.classList.add(lite ? "world-lite" : "world-full");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.3 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    var W = window.innerWidth, H = window.innerHeight; renderer.setSize(W, H, false);
    document.body.classList.add("has-world");

    var INK = 0x0a201a;
    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(INK, 0.024);
    scene.environment = makeEnvTexture(renderer);
    // upgrade to a real HDRI for lifelike, warm golden reflections (async; procedural stays as fallback)
    function loadHDR(urls, i) {
      if (!THREE.RGBELoader || i >= urls.length) return;
      try {
        new THREE.RGBELoader().load(urls[i], function (hdr) {
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          var pm = new THREE.PMREMGenerator(renderer); pm.compileEquirectangularShader();
          scene.environment = pm.fromEquirectangular(hdr).texture; hdr.dispose();
        }, undefined, function () { loadHDR(urls, i + 1); });
      } catch (e) {}
    }
    if (!lite) loadHDR([
      "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/venice_sunset_1k.hdr",
      "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/royal_esplanade_1k.hdr"
    ], 0);

    var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 240);

    scene.add(new THREE.HemisphereLight(0x44664e, 0x06140e, 1.05));
    var key = new THREE.DirectionalLight(0xffd98c, 1.05); key.position.set(9, 14, 9); scene.add(key);
    var fill = new THREE.DirectionalLight(0x5b9c80, 0.55); fill.position.set(-13, 6, -4); scene.add(fill);
    var starLight = new THREE.PointLight(0xffcf8a, 0.85, 70, 2); starLight.position.set(0, 5, 7); scene.add(starLight);

    var world = new THREE.Group(); scene.add(world);
    world.add(makeMountain());
    var wireMtn = null;

    /* gold compass-star */
    var star = new THREE.Mesh(makeStarGeometry(), new THREE.MeshPhysicalMaterial({
      color: 0xD9B36A, metalness: 1.0, roughness: 0.42, clearcoat: 0.2, clearcoatRoughness: 0.4,
      envMapIntensity: 0.55, emissive: 0x3a2a0c, emissiveIntensity: 0.28
    }));
    star.position.set(0, 4.2, 0); world.add(star);
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), new THREE.MeshBasicMaterial({ color: 0xfff0cf }));
    core.position.copy(star.position); world.add(core);
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialSprite([[0, "rgba(255,224,150,0.5)"], [0.25, "rgba(240,190,110,0.22)"], [1, "rgba(226,178,92,0)"]]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    halo.scale.set(16, 16, 1); halo.position.copy(star.position); world.add(halo);

    /* clickable gold ISO coins */
    var coins = [];
    var rimMat = new THREE.MeshStandardMaterial({ color: 0xC9A24B, metalness: 1.0, roughness: 0.46, envMapIntensity: 0.5 });
    for (var k = 0; k < STANDARDS.length; k++) {
      var code = STANDARDS[k];
      var geo = new THREE.CylinderGeometry(0.95, 0.95, 0.17, 96, 1);
      geo.rotateX(Math.PI / 2);   // faces point ±Z
      var faceMat = new THREE.MeshStandardMaterial({ map: coinTexture(code), metalness: 0.6, roughness: 0.52, envMapIntensity: 0.45 });
      var coin = new THREE.Mesh(geo, [rimMat, faceMat, faceMat]);
      coin.userData = {
        code: code, radius: 6.4 + (k % 3) * 2.0, baseAngle: (k / STANDARDS.length) * Math.PI * 2,
        speed: 0.04 + (k % 4) * 0.012, y: (k % 5) * 1.7 - 3.4, bob: 0.4 + Math.random() * 0.5,
        phase: Math.random() * 6.28, scale: 1, target: 1
      };
      world.add(coin); coins.push(coin);
    }

    /* decorative polished gemstones (high-detail, clearcoat) */
    var gems = [];
    var gemGeo = new THREE.IcosahedronGeometry(0.5, 3);
    var gemGold = new THREE.MeshPhysicalMaterial({ color: 0xCBA45A, metalness: 1.0, roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.5 });
    var gemJade = new THREE.MeshPhysicalMaterial({ color: 0x1f6b4e, metalness: 0.3, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.5 });
    for (var gi = 0; gi < 9; gi++) {
      var gm = new THREE.Mesh(gemGeo, gi % 3 === 0 ? gemJade : gemGold);
      var ga = Math.random() * 6.28, gr = 8 + Math.random() * 6;
      gm.scale.setScalar(0.55 + Math.random() * 0.8);
      gm.position.set(Math.cos(ga) * gr, Math.random() * 9 - 4.5, Math.sin(ga) * gr - 3);
      gm.userData = { sp: 0.3 + Math.random() * 0.8, ph: Math.random() * 6.28, baseY: gm.position.y };
      world.add(gm); gems.push(gm);
    }

    /* motes */
    var N = lite ? 220 : 460, parr = new Float32Array(N * 3);
    for (var p = 0; p < N; p++) { parr[p * 3] = (Math.random() - 0.5) * 72; parr[p * 3 + 1] = (Math.random() - 0.5) * 46; parr[p * 3 + 2] = (Math.random() - 0.5) * 52; }
    var pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(parr, 3));
    var motes = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xF2CA7E, size: 0.12, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    /* camera choreography */
    var KF = [
      { p: [0, 5.6, 27], l: [0, 4.2, 0] },
      { p: [8.5, 3, 15], l: [0, 4.2, 0] },
      { p: [-7.5, 7.5, 16], l: [0, 3, -2] },
      { p: [6.5, 1.6, 13.5], l: [0, 4.2, 0] },
      { p: [0, 4, 31], l: [0, 2, -2] }
    ];
    function sampleKF(frac) {
      var n = KF.length - 1, x = clamp(frac, 0, 1) * n, i = Math.min(Math.floor(x), n - 1), t = x - i;
      t = t * t * (3 - 2 * t); var a = KF[i], b = KF[i + 1];
      return { p: [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t)], l: [lerp(a.l[0], b.l[0], t), lerp(a.l[1], b.l[1], t), lerp(a.l[2], b.l[2], t)] };
    }
    var docH = function () { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); };
    var pX = 0, pY = 0, cX = 0, cY = 0, lastX = -1, lastY = -1;
    window.addEventListener("pointermove", function (e) {
      pX = (e.clientX / window.innerWidth) * 2 - 1; pY = (e.clientY / window.innerHeight) * 2 - 1;
      lastX = e.clientX; lastY = e.clientY;
    }, { passive: true });

    var servicesEl = document.getElementById("services");
    function place() {
      var kf = sampleKF(window.scrollY / docH());
      // "climb the mountain" while scrolling through the services section
      if (servicesEl) {
        var r = servicesEl.getBoundingClientRect(), vh = window.innerHeight;
        if (r.top < vh && r.bottom > 0 && r.height > 0) {
          var sp = clamp((vh * 0.85 - r.top) / r.height, 0, 1);          // ascent progress
          var center = clamp(1 - Math.abs((r.top + r.height / 2) - vh / 2) / (vh * 0.5 + r.height * 0.5), 0, 1);
          var cp = [lerp(-6, 2.5, sp), lerp(-1.5, 9, sp), lerp(19, 9.5, sp)];   // base camp → summit
          var cl = [0, lerp(-2, 5, sp), -2];                                     // look up toward the summit star
          kf.p[0] = lerp(kf.p[0], cp[0], center); kf.p[1] = lerp(kf.p[1], cp[1], center); kf.p[2] = lerp(kf.p[2], cp[2], center);
          kf.l[0] = lerp(kf.l[0], cl[0], center); kf.l[1] = lerp(kf.l[1], cl[1], center); kf.l[2] = lerp(kf.l[2], cl[2], center);
        }
      }
      cX += (pX - cX) * 0.05; cY += (pY - cY) * 0.05;
      camera.position.set(kf.p[0] + cX * 3.5, kf.p[1] - cY * 2.0, kf.p[2]);
      camera.lookAt(kf.l[0], kf.l[1], kf.l[2]);
    }

    /* coin picking */
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hover = null;
    function overOpen(x, y) {
      var el = document.elementFromPoint(x, y);
      return !el || !el.closest("a,button,.btn,.stage,.member,.value,.contact-card,.about-figure,.modal,.nav,input,.marquee-track,.iso-chip");
    }
    function pick() {
      if (lastX < 0) return null;
      ndc.x = (lastX / window.innerWidth) * 2 - 1; ndc.y = -(lastY / window.innerHeight) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObjects(coins, false);
      if (hit.length && overOpen(lastX, lastY)) return hit[0].object;
      return null;
    }
    window.addEventListener("click", function (e) {
      lastX = e.clientX; lastY = e.clientY;
      var c = pick();
      if (c && window.OEU && window.OEU.openIso) window.OEU.openIso(c.userData.code);
    });

    function resize() { W = window.innerWidth; H = window.innerHeight; renderer.setSize(W, H, false); if (composer) composer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); }
    window.addEventListener("resize", resize, { passive: true });

    /* real bloom post-processing (cinematic glow); falls back to plain render */
    var composer = null;
    try {
      if (!lite && THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
        composer = new THREE.EffectComposer(renderer);
        composer.setPixelRatio(renderer.getPixelRatio());
        composer.setSize(W, H);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.2, 0.6, 0.93));
        if (THREE.SMAAPass) composer.addPass(new THREE.SMAAPass(W * renderer.getPixelRatio(), H * renderer.getPixelRatio()));
      }
    } catch (e) { composer = null; }
    function renderFrame() { if (composer) composer.render(); else renderer.render(scene, camera); }

    if (reduce) {
      place();
      coins.forEach(function (c) { var d = c.userData; c.position.set(Math.cos(d.baseAngle) * d.radius, d.y, Math.sin(d.baseAngle) * d.radius - 2); c.lookAt(camera.position); });
      renderFrame();
      window.addEventListener("scroll", function () { place(); renderFrame(); }, { passive: true });
      return;
    }

    var running = true, t0 = performance.now();
    var fpsN = 0, fpsT = 0, downgraded = false;
    function frame(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      if (!downgraded && !lite) {
        fpsN++;
        if (fpsN === 20) fpsT = now;
        else if (fpsN === 100) {
          var fps = 80000 / (now - fpsT);
          if (fps < 42) { downgraded = true; composer = null; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3)); resize(); document.body.classList.remove("world-full"); document.body.classList.add("world-lite"); }
        }
      }
      place();
      star.rotation.y = t * 0.3; star.rotation.x = Math.sin(t * 0.4) * 0.12;
      core.scale.setScalar(1 + Math.sin(t * 2) * 0.07);
      halo.scale.setScalar(16 + Math.sin(t * 1.6) * 1.4);
      starLight.intensity = 1.1 + Math.sin(t * 2) * 0.3;
      var h = pick();
      if (h !== hover) { if (hover) hover.userData.target = 1; hover = h; document.body.style.cursor = h ? "pointer" : ""; if (h) h.userData.target = 1.32; }
      for (var i = 0; i < coins.length; i++) {
        var c = coins[i], d = c.userData, ang = d.baseAngle + t * d.speed;
        c.position.set(Math.cos(ang) * d.radius, d.y + Math.sin(t * d.bob + d.phase) * 0.45, Math.sin(ang) * d.radius - 2);
        c.lookAt(camera.position);
        d.scale += (d.target - d.scale) * 0.15; c.scale.setScalar(d.scale);
      }
      for (var j = 0; j < gems.length; j++) { var gm = gems[j], gd = gm.userData; gm.rotation.x += 0.01 * gd.sp; gm.rotation.y += 0.014 * gd.sp; gm.position.y = gd.baseY + Math.sin(t * gd.sp + gd.ph) * 0.6; }
      motes.rotation.y = t * 0.009;
      renderFrame();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) { t0 = performance.now() - 1; requestAnimationFrame(frame); } });
  }

  /* ---------- pointer tilt + glare on cards ---------- */
  function initTilt() {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    Array.prototype.slice.call(document.querySelectorAll(".stage, .member, .contact-card, .about-figure")).forEach(function (el) {
      el.classList.add("tilt");
      var glare = document.createElement("span"); glare.className = "tilt-glare"; el.appendChild(glare);
      var raf = 0, rect = null;
      el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); el.classList.add("tilting"); });
      el.addEventListener("pointermove", function (e) {
        if (!rect) rect = el.getBoundingClientRect(); if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0; var mx = e.clientX - rect.left, my = e.clientY - rect.top;
          el.style.transform = "perspective(950px) rotateX(" + (-(my / rect.height - 0.5) * 6).toFixed(2) + "deg) rotateY(" + ((mx / rect.width - 0.5) * 6).toFixed(2) + "deg) translateY(-5px)";
          el.style.setProperty("--gx", (mx / rect.width * 100).toFixed(1) + "%"); el.style.setProperty("--gy", (my / rect.height * 100).toFixed(1) + "%");
        });
      });
      el.addEventListener("pointerleave", function () { rect = null; el.classList.remove("tilting"); el.style.transform = ""; });
    });
  }

  function start() { try { initWorld(); } catch (e) {} initTilt(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
