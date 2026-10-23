document.addEventListener("DOMContentLoaded", () => {
  const subject = document.querySelector("#subject"), service = new URLSearchParams(location.search).get("servicio");
  if (subject && service) subject.value = "Servicios";
});
