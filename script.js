// Small enhancements only: the page works fully without this file.

// ----- Theme toggle -----
// The page follows the system light/dark setting until the visitor clicks the
// toggle. Their choice is saved and applied early by the inline script in <head>.
const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");

function currentTheme() {
  if (root.dataset.theme) return root.dataset.theme;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateToggleLabel() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  toggle.setAttribute("aria-label", `Switch to ${next} theme`);
}

toggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch (e) {
    // Storage blocked (private mode etc.): the choice just won't persist.
  }
  updateToggleLabel();
  // The canvas reads its colours from CSS, so tell it the theme changed.
  document.dispatchEvent(new Event("themechange"));
});

updateToggleLabel();

// ----- Nav highlighting -----
// Marks the nav link for whichever section is currently in the middle of the
// screen, using IntersectionObserver instead of listening to every scroll event.
const navLinks = document.querySelectorAll(".nav-links a");
const sections = [...navLinks].map((link) => document.querySelector(link.hash));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    });
  },
  // Only a thin band across the middle of the viewport counts as "in view".
  { rootMargin: "-45% 0px -50% 0px" }
);

sections.forEach((section) => section && observer.observe(section));

// ----- Demo videos -----
// Muted clips loop on their own, but only for visitors who haven't asked their
// system for reduced motion. Everyone gets the video controls to play/pause.
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  document.querySelectorAll("video[data-autoplay]").forEach((video) => {
    // play() returns a promise that rejects if the browser blocks autoplay; that's fine.
    video.play().catch(() => {});
  });
}

// ----- Sound buttons -----
// Unmuting is allowed once the visitor clicks, so the button also starts
// playback (for reduced-motion visitors whose video hasn't started yet).
document.querySelectorAll(".sound-toggle").forEach((button) => {
  const video = document.getElementById(button.dataset.video);
  if (!video) return;

  function sync() {
    const soundOn = !video.muted;
    button.textContent = soundOn ? "Mute sound" : "Turn on sound";
    button.setAttribute("aria-pressed", String(soundOn));
  }

  button.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted) video.play().catch(() => {});
  });

  // Keep the label right if the visitor uses the video's own mute control instead.
  video.addEventListener("volumechange", sync);
  button.hidden = false;
  sync();
});

// ----- Hero swirls -----
// Imitates the JFE artwork: each "ribbon" is a wobbly closed loop drawn as
// many thin parallel strands, so it looks like a brush stroke made of lines.
// The loop is a circle whose radius wobbles with sin(lobes * angle), squashed
// into an ellipse and rotated. Animating means slowly turning each ribbon and
// shifting its wobble.
const swirl = document.querySelector(".hero-swirl");

if (swirl) {
  const ctx = swirl.getContext("2d");

  // cx/cy: centre as a fraction of the canvas; size: radius as a fraction of
  // its shorter side; colour: which --swirl-N token to use.
  const ribbons = [
    { colour: "--swirl-1", cx: 0.70, cy: 0.52, size: 0.40, squash: 0.62, lobes: 3, wobble: 0.16, strands: 14, spin: 0.05, tilt: 0.4 },
    { colour: "--swirl-2", cx: 0.66, cy: 0.46, size: 0.34, squash: 0.80, lobes: 2, wobble: 0.22, strands: 12, spin: -0.07, tilt: 1.9 },
    { colour: "--swirl-3", cx: 0.74, cy: 0.56, size: 0.30, squash: 0.55, lobes: 4, wobble: 0.12, strands: 10, spin: 0.09, tilt: 2.8 },
    { colour: "--swirl-4", cx: 0.62, cy: 0.58, size: 0.44, squash: 0.48, lobes: 3, wobble: 0.10, strands: 9, spin: -0.04, tilt: 0.9 },
    { colour: "--swirl-5", cx: 0.72, cy: 0.48, size: 0.24, squash: 0.90, lobes: 5, wobble: 0.20, strands: 12, spin: 0.06, tilt: 3.6 },
  ];
  const POINTS = 140; // points per strand; enough for smooth curves
  let width = 0;
  let height = 0;

  function readColours() {
    const styles = getComputedStyle(document.documentElement);
    ribbons.forEach((r) => (r.stroke = styles.getPropertyValue(r.colour).trim()));
  }

  // Match the canvas's pixel size to its CSS size (times devicePixelRatio for sharp lines).
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = swirl.clientWidth;
    height = swirl.clientHeight;
    swirl.width = Math.round(width * dpr);
    swirl.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(seconds) {
    ctx.clearRect(0, 0, width, height);
    const unit = Math.min(width, height);
    ctx.lineWidth = 1;

    ribbons.forEach((r) => {
      const angle = r.tilt + seconds * r.spin;
      const phase = seconds * r.spin * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.strokeStyle = r.stroke;

      for (let s = 0; s < r.strands; s++) {
        // Each strand is a little bigger than the last, which builds the ribbon.
        const radius = unit * (r.size + s * 0.007);
        ctx.globalAlpha = 0.25 + 0.5 * (s / r.strands);
        ctx.beginPath();
        for (let i = 0; i <= POINTS; i++) {
          const t = (i / POINTS) * Math.PI * 2;
          const rr = radius * (1 + r.wobble * Math.sin(r.lobes * t + phase + s * 0.04));
          const x = rr * Math.cos(t);
          const y = rr * Math.sin(t) * r.squash;
          // Rotate the ellipse, then move it to its centre.
          const px = r.cx * width + x * cos - y * sin;
          const py = r.cy * height + x * sin + y * cos;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  // Animate only while the hero is on screen; reduced-motion visitors get one still frame.
  let visible = true;
  let frame = 0;
  function loop(ms) {
    draw(ms / 1000);
    if (visible) frame = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(frame);
    if (reduceMotion) draw(0);
    else frame = requestAnimationFrame(loop);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(swirl);

  new ResizeObserver(() => {
    resize();
    if (reduceMotion) draw(0);
  }).observe(swirl);

  // Recolour when the theme changes, from the toggle or the system setting.
  const redraw = () => {
    readColours();
    if (reduceMotion) draw(0);
  };
  document.addEventListener("themechange", redraw);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);

  readColours();
  resize();
  start();
}
