(() => {
    const themeKey = "zamboanga-cultural-guide-theme";
    const themeToggle = document.querySelector(".theme-toggle");

    const getSavedTheme = () => {
        try {
            return localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
        } catch (error) {
            console.warn("Could not read the saved color theme.", error);
            return "light";
        }
    };

    const setTheme = (theme) => {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = isDark ? "dark" : "light";

        if (themeToggle) {
            themeToggle.setAttribute("aria-pressed", String(isDark));
            themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
            themeToggle.setAttribute("title", `Switch to ${isDark ? "light" : "dark"} mode`);
        }
    };

    setTheme(getSavedTheme());

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
            setTheme(nextTheme);

            try {
                localStorage.setItem(themeKey, nextTheme);
            } catch (error) {
                console.warn("Could not save the selected color theme.", error);
            }
        });
    }
})();
