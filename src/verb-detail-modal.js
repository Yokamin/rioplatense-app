import {
  buildVerbDetailHtml,
  wireVerbDetailInteractions,
} from "./verb-detail-ui.js";

export function initVerbDetailModal({ modalEl, bodyEl, closeEl }) {
  function close() {
    modalEl.hidden = true;
  }

  function open(verb, highlight = null) {
    if (!verb) {
      return;
    }

    bodyEl.innerHTML = buildVerbDetailHtml(verb, highlight);
    wireVerbDetailInteractions(bodyEl);
    modalEl.hidden = false;
  }

  closeEl.addEventListener("click", close);
  modalEl.addEventListener("click", (event) => {
    if (event.target === modalEl) {
      close();
    }
  });

  return { open, close };
}
