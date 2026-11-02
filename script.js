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

  // YouTube embeds: loop needs playlist=<same id>, otherwise the player stops at the end.
  document.querySelectorAll("iframe[data-youtube-id]").forEach((frame) => {
    const id = frame.dataset.youtubeId;
    frame.src += `&autoplay=1&loop=1&playlist=${id}`;
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
