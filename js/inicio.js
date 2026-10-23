document.addEventListener("DOMContentLoaded", () => {
  const slides = [...document.querySelectorAll('input[name="home-slides"]')]; if (slides.length < 2) return;
  let current = Math.max(0, slides.findIndex(slide => slide.checked));
  setInterval(() => { current = (current + 1) % slides.length; slides[current].checked = true; }, 5000);
});
