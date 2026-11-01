(() => {
    const timeline = document.querySelector(".timeline-section");
    const timelineItems = Array.from(document.querySelectorAll(".timeline-item"));

    if (!timeline || timelineItems.length === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) return;

    timeline.classList.add("timeline-sequence-ready");

    const revealTimeline = () => {
        timelineItems.forEach((item, index) => {
            window.setTimeout(() => item.classList.add("is-visible"), index * 180);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            revealTimeline();
        }
    }, { threshold: 0.15 });

    observer.observe(timeline);
})();
