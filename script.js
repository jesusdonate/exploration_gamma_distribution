const TRANSITION_MS = 320;

const body = document.querySelector("body[data-page]");

if (body) {
  body.classList.add("page-enter");

  window.requestAnimationFrame(() => {
    body.classList.remove("page-enter");
  });

  const links = document.querySelectorAll("a[href]");

  for (const link of links) {
    const href = link.getAttribute("href");

    if (!href) {
      continue;
    }

    const isInternalPage =
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:");

    if (!isInternalPage) {
      continue;
    }

    link.addEventListener("click", (event) => {
      const target = link.getAttribute("href");
      if (!target) return;

      event.preventDefault();
      body.classList.add("page-leave");

      window.setTimeout(() => {
        window.location.href = target;
      }, TRANSITION_MS);
    });
  }
}
