// Apply the saved theme before first paint to avoid a flash.
(function () {
  try {
    var stored = localStorage.getItem("synapsvault-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();

// Apply the saved language before first paint to avoid a flash.
(function () {
  try {
    var storedLang = localStorage.getItem("synapsvault-lang");
    var navLang = (navigator.language || "").split("-")[0].toLowerCase();
    var lang =
      storedLang === "en" || storedLang === "es"
        ? storedLang
        : navLang === "es"
          ? "es"
          : "en";
    document.documentElement.lang = lang;
  } catch (e) {}
})();
