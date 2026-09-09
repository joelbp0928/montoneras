const THEME_KEY = "app-theme";

export function initTheme() {
	const savedTheme = localStorage.getItem(THEME_KEY);
	const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const theme = savedTheme || (systemDark ? "dark" : "light");

	applyTheme(theme);

	document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
}

function toggleTheme() {
	const current = document.documentElement.dataset.theme;
	const next = current === "dark" ? "light" : "dark";

	localStorage.setItem(THEME_KEY, next);
	applyTheme(next);
}

function applyTheme(theme) {
	document.documentElement.dataset.theme = theme;

	const icon = document.getElementById("themeIcon");
	if (!icon) return;

	icon.className = theme === "dark"
		? "bi bi-sun"
		: "bi bi-moon-stars";
}