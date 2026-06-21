/* ОЭУ ХХК — SITE-WIDE 3D WORLD (Three.js r128)
   One fixed, full-page canvas behind all content. Scrolling flies the camera
   through a 3D scene: a green low-poly summit, a giant rotating gold
   compass-star (the brand mark, in 3D), and floating standard-tokens.
   Graceful fallback if WebGL/THREE unavailable; respects reduced-motion.
   Also: pointer tilt + glare on cards.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ===== procedural environment map (for gold reflections) ===== */
  function makeEnvTexture(renderer) {
    var c = document.createElement("canvas"); c.width = 16; c.height = 256;
    var g = c.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.0, "#1b3a2c");   // upper green sky
    grd.addColorStop(0.45, "#0a201a");  // deep green
    grd.addColorStop(0.62, "#caa24f");  // warm gold horizon band (reflection highlight)
    grd.addColorStop(0.8, "#0c2620");
    grd.addColorStop(1.0, "#05120d");
    g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var rt = pmrem.fromEquirectangular(tex);
    tex.dispose();
    return rt.texture;
  }

  /* ===== terrain height (re-used from the summit hero) ===== */
  function height(x, z) {
    var v = 0;
    v += 1.7 * Math.sin(x * 0.20 + 1.0) * Math.cos(z * 0.18 + 0.5);
    v += 0.95 * Math.sin(x * 0.46 + 3.0) * Math.cos(z * 0.37 + 1.7);
    v += 0.5 * Math.sin(x * 0.95 + 0.3) * Math.cos(z * 0.80 + 2.2);
    var dx = x - 4, dz = z + 2;
    v += 7.5 * Math.exp(-(dx * dx + dz * dz) / 46);
    var ex = x + 11, ez = z + 6;
    v += 3.0 * Math.exp(-(ex * ex + ez * ez) / 60);
    return v;
  }

  /* ===== 8-point compass star geometry (the brand mark, extruded to 3D) ===== */
  function makeStarGeometry() {
    var shape = new THREE.Shape();
    var spikes = 8, outer = 3.3, inner = 1.28;
    for (var i = 0; i < spikes * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.55, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.22, bevelSegments: 2, steps: 1
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }

  function initWorld() {
    if (typeof THREE === "undefined") return;
    var canvas = document.getElementById("bgCanvas");
    if (!canvas) return;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var W = window.innerWidth, H = window.innerHeight;
    renderer.setSize(W, H, false);

    document.body.classList.add("has-world");

    var INK = 0x0a201a;
    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(INK, 0.03);
    scene.environment = makeEnvTexture(renderer);

    var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 220);

    /* lights */
    scene.add(new THREE.HemisphereLight(0x3c5c46, 0x06140e, 0.75));
    var key = new THREE.DirectionalLight(0xffd385, 1.55); key.position.set(9, 13, 8); scene.add(key);
    var fill = new THREE.DirectionalLight(0x4f8a72, 0.5); fill.position.set(-12, 6, -4); scene.add(fill);
    var starLight = new THREE.PointLight(0xffcf8a, 1.1, 60, 2); starLight.position.set(0, 5, 6); scene.add(starLight);

    var world = new THREE.Group(); scene.add(world);

    /* --- terrain --- */
    var tGeo = new THREE.PlaneGeometry(70, 54, 96, 72);
    var tp = tGeo.attributes.position;
    for (var i = 0; i < tp.count; i++) tp.setZ(i, height(tp.getX(i), tp.getY(i)));
    tGeo = tGeo.toNonIndexed(); tGeo.computeVertexNormals();
    var terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: 0x163a2a, roughness: 0.92, metalness: 0.05, flatShading: true }));
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -7.5, -8);
    world.add(terrain);
    var wire = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: 0xE2B25C, wireframe: true, transparent: true, opacity: 0.05 }));
    wire.rotation.x = -Math.PI / 2; wire.position.copy(terrain.position); world.add(wire);

    /* --- the gold compass-star (hero 3D figure) --- */
    var star = new THREE.Mesh(makeStarGeometry(), new THREE.MeshStandardMaterial({ color: 0xE7B85C, metalness: 1.0, roughness: 0.22, emissive: 0x4a3410, emissiveIntensity: 0.45 }));
    star.position.set(0, 4, 0);
    world.add(star);
    // inner glow core
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: 0xfff0cf }));
    core.position.copy(star.position); world.add(core);

    /* --- floating standard-tokens --- */
    var tokens = [];
    var goldMat = new THREE.MeshStandardMaterial({ color: 0xCBA14B, metalness: 1.0, roughness: 0.3 });
    var jadeMat = new THREE.MeshStandardMaterial({ color: 0x1d4634, metalness: 0.4, roughness: 0.35, flatShading: true });
    var tokenGeoA = new THREE.IcosahedronGeometry(0.6, 0);
    var tokenGeoB = new THREE.OctahedronGeometry(0.62, 0);
    for (var k = 0; k < 16; k++) {
      var ang = (k / 16) * Math.PI * 2;
      var rad = 7 + (k % 4) * 2.2;
      var m = new THREE.Mesh(k % 3 === 0 ? tokenGeoA : tokenGeoB, k % 2 === 0 ? goldMat : jadeMat);
      m.position.set(Math.cos(ang) * rad, (k % 5) * 1.6 - 3 + Math.sin(k) * 2, Math.sin(ang) * rad - 2);
      m.userData = { spin: 0.2 + Math.random() * 0.6, ph: Math.random() * 6.28, amp: 0.4 + Math.random() * 0.8, baseY: m.position.y };
      world.add(m); tokens.push(m);
    }

    /* --- drifting motes --- */
    var N = 480, parr = new Float32Array(N * 3);
    for (var p = 0; p < N; p++) { parr[p * 3] = (Math.random() - 0.5) * 70; parr[p * 3 + 1] = (Math.random() - 0.5) * 44; parr[p * 3 + 2] = (Math.random() - 0.5) * 50; }
    var pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(parr, 3));
    var motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xF2CA7E, size: 0.13, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    /* --- camera choreography keyframes (by scroll fraction) --- */
    var KF = [
      { p: [0, 5.5, 27], l: [0, 4, 0] },   // hero — star + summit
      { p: [8, 3, 15], l: [0, 4, 0] },     // about — orbit toward star
      { p: [-7, 7, 16], l: [0, 3, -2] },   // services/ethos — rise
      { p: [6, 1.5, 14], l: [0, 4, 0] },   // team — close pass
      { p: [0, 4, 30], l: [0, 2, -2] }     // contact — pull back, calm
    ];
    function sampleKF(frac) {
      var n = KF.length - 1, x = clamp(frac, 0, 1) * n;
      var i = Math.min(Math.floor(x), n - 1), t = x - i;
      // smoothstep easing
      t = t * t * (3 - 2 * t);
      var a = KF[i], b = KF[i + 1];
      return {
        p: [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t)],
        l: [lerp(a.l[0], b.l[0], t), lerp(a.l[1], b.l[1], t), lerp(a.l[2], b.l[2], t)]
      };
    }

    var docH = function () { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); };
    var px = 0, py = 0, cx = 0, cy = 0;
    window.addEventListener("pointermove", function (e) { px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });

    function place() {
      var frac = window.scrollY / docH();
      var kf = sampleKF(frac);
      cx += (px - cx) * 0.05; cy += (py - cy) * 0.05;
      camera.position.set(kf.p[0] + cx * 3.5, kf.p[1] - cy * 2.0, kf.p[2]);
      camera.lookAt(kf.l[0], kf.l[1], kf.l[2]);
    }

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize, { passive: true });

    if (reduce) {
      place(); renderer.render(scene, camera);
      window.addEventListener("scroll", function () { place(); renderer.render(scene, camera); }, { passive: true });
      return;
    }

    var running = true, t0 = performance.now();
    function frame(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      star.rotation.y = t * 0.32; star.rotation.x = Math.sin(t * 0.4) * 0.12;
      core.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
      starLight.intensity = 1.0 + Math.sin(t * 2) * 0.25;
      for (var j = 0; j < tokens.length; j++) {
        var m = tokens[j], d = m.userData;
        m.rotation.x += 0.004 * d.spin * 4; m.rotation.y += 0.006 * d.spin * 4;
        m.position.y = d.baseY + Math.sin(t * d.spin + d.ph) * d.amp;
      }
      motes.rotation.y = t * 0.01;
      place();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden; if (running) { t0 = performance.now() - 1; requestAnimationFrame(frame); }
    });
  }

  /* ===== pointer tilt + glare on cards ===== */
  function initTilt() {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll(".stage, .member, .contact-card, .about-figure"));
    cards.forEach(function (el) {
      el.classList.add("tilt");
      var glare = document.createElement("span"); glare.className = "tilt-glare"; el.appendChild(glare);
      var raf = 0, rect = null;
      el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); el.classList.add("tilting"); });
      el.addEventListener("pointermove", function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var mx = e.clientX - rect.left, my = e.clientY - rect.top;
          var rx = (my / rect.height - 0.5), ry = (mx / rect.width - 0.5);
          el.style.transform = "perspective(950px) rotateX(" + (-rx * 6).toFixed(2) + "deg) rotateY(" + (ry * 6).toFixed(2) + "deg) translateY(-5px)";
          el.style.setProperty("--gx", (mx / rect.width * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", (my / rect.height * 100).toFixed(1) + "%");
        });
      });
      el.addEventListener("pointerleave", function () { rect = null; el.classList.remove("tilting"); el.style.transform = ""; });
    });
  }

  function start() { try { initWorld(); } catch (e) {} initTilt(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
