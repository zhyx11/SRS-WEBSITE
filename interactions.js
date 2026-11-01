(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealSelector = [
        ".culture-card",
        ".feature-inner",
        ".welcome-video__content",
        ".section-heading",
        ".introduction",
        ".food-introduction",
        ".food-section__heading",
        ".info-card",
        ".fort-grid",
        ".gallery-card",
        ".closing-content",
        ".tradition-card",
        ".detail-container",
        ".food-card",
        ".content-card",
        ".phrase-row",
        ".source-list li"
    ].join(",");

    document.documentElement.classList.add("has-interactions");

    const revealItems = Array.from(document.querySelectorAll(revealSelector));
    if (reducedMotion || !("IntersectionObserver" in window)) {
        revealItems.forEach((item) => item.classList.add("reveal-on-scroll", "is-visible"));
    } else {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

        revealItems.forEach((item, index) => {
            item.classList.add("reveal-on-scroll");
            item.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
            revealObserver.observe(item);
        });
    }

    const cultureCards = Array.from(document.querySelectorAll(".culture-card"));
    const cultureSearch = document.getElementById("culture-search");
    const cultureFilters = Array.from(document.querySelectorAll(".culture-filter"));
    const cultureResults = document.getElementById("culture-results");
    const cultureEmpty = document.getElementById("culture-empty");
    const homePageStateKey = "zamboanga-culture-home-state";
    const isCultureHomePage = Boolean(document.getElementById("explore") && cultureCards.length);
    let activeCultureCard = null;

    if (cultureCards.length && cultureSearch && cultureFilters.length && cultureResults && cultureEmpty) {
        let selectedCategory = "all";

        const normalizeSearchText = (value) => value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ");

        const validCategories = new Set(["all", ...cultureFilters.map((filter) => filter.dataset.filter)]);
        let returnState = null;

        if (isCultureHomePage) {
            const storedState = sessionStorage.getItem(homePageStateKey);
            if (storedState) {
                try {
                    const parsedState = JSON.parse(storedState);
                    if (
                        parsedState
                        && Number.isFinite(parsedState.scrollY)
                        && typeof parsedState.search === "string"
                        && validCategories.has(parsedState.category)
                        && (
                            parsedState.cardIndex === null
                            || (
                                Number.isInteger(parsedState.cardIndex)
                                && parsedState.cardIndex >= 0
                                && parsedState.cardIndex < cultureCards.length
                            )
                        )
                        && (parsedState.cardOffset === null || Number.isFinite(parsedState.cardOffset))
                    ) {
                        returnState = parsedState;
                        cultureSearch.value = returnState.search;
                        selectedCategory = returnState.category;
                        cultureFilters.forEach((filter) => {
                            const isActive = filter.dataset.filter === selectedCategory;
                            filter.classList.toggle("is-active", isActive);
                            filter.setAttribute("aria-pressed", String(isActive));
                        });
                    } else {
                        sessionStorage.removeItem(homePageStateKey);
                    }
                } catch (error) {
                    console.warn("Could not read the saved culture-guide position.", error);
                    sessionStorage.removeItem(homePageStateKey);
                }
            }
        }

        const filterCultureCards = () => {
            const queryTerms = normalizeSearchText(cultureSearch.value).trim().split(/\s+/).filter(Boolean);
            let visibleCount = 0;

            cultureCards.forEach((card) => {
                const searchableText = normalizeSearchText(`${card.dataset.search || ""} ${card.textContent || ""}`);
                const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
                const matchesSearch = queryTerms.every((term) => searchableText.includes(term));
                const isVisible = matchesCategory && matchesSearch;

                card.hidden = !isVisible;
                if (isVisible) visibleCount += 1;
            });

            cultureResults.textContent = `${visibleCount} ${visibleCount === 1 ? "topic" : "topics"} shown`;
            cultureEmpty.hidden = visibleCount > 0;
        };

        const saveHomePageState = (targetCard = null) => {
            const cardIndex = targetCard ? cultureCards.indexOf(targetCard) : -1;
            const state = {
                scrollY: window.scrollY,
                search: cultureSearch.value,
                category: selectedCategory,
                cardIndex: cardIndex >= 0 ? cardIndex : null,
                cardOffset: cardIndex >= 0
                    ? targetCard.getBoundingClientRect().top
                    : null
            };

            sessionStorage.setItem(homePageStateKey, JSON.stringify(state));
        };

        const restoreHomePageState = () => {
            if (!returnState) return;

            history.scrollRestoration = "manual";
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    let targetY = returnState.scrollY;
                    const targetCard = returnState.cardIndex === null
                        ? null
                        : cultureCards[returnState.cardIndex];

                    if (targetCard && !targetCard.hidden && returnState.cardOffset !== null) {
                        targetY = window.scrollY
                            + targetCard.getBoundingClientRect().top
                            - returnState.cardOffset;
                    }

                    window.scrollTo({
                        top: Math.max(0, targetY),
                        behavior: reducedMotion ? "auto" : "smooth"
                    });
                    sessionStorage.removeItem(homePageStateKey);
                    returnState = null;
                });
            });
        };

        cultureSearch.addEventListener("input", filterCultureCards);
        cultureFilters.forEach((filter) => {
            filter.addEventListener("click", () => {
                selectedCategory = filter.dataset.filter || "all";
                cultureFilters.forEach((button) => {
                    const isActive = button === filter;
                    button.classList.toggle("is-active", isActive);
                    button.setAttribute("aria-pressed", String(isActive));
                });
                filterCultureCards();
            });
        });

        document.addEventListener("click", (event) => {
            if (!(event.target instanceof Element)) return;
            const link = event.target.closest("a[href]");
            if (!link) return;

            const destination = new URL(link.href, window.location.href);
            const isHomeAnchor = destination.pathname === window.location.pathname
                && destination.hash === "#home";

            if (isCultureHomePage && isHomeAnchor) {
                sessionStorage.removeItem(homePageStateKey);
                history.scrollRestoration = "auto";
                return;
            }

            if (isCultureHomePage && destination.origin === window.location.origin) {
                const card = link.closest(".culture-card") || activeCultureCard;
                activeCultureCard = card;
                saveHomePageState(card);
            }
        });

        if (isCultureHomePage) {
            window.addEventListener("pagehide", () => {
                saveHomePageState(activeCultureCard);
            });
            window.addEventListener("pageshow", (event) => {
                if (event.persisted) {
                    sessionStorage.removeItem(homePageStateKey);
                }
            });
        }

        filterCultureCards();
        restoreHomePageState();
    }

    const cultureDetails = {
        festival: {
            title: "Festivals of Zamboanga",
            href: "celebrations.html#hermosa",
            linkText: "Explore festival traditions",
            content: `
                <p>Zamboanga's festivals and celebrations reflect its history, religious traditions, and diverse communities. The Zamboanga Hermosa Festival, also called Fiesta Pilar, honors Nuestra Señora del Pilar (Our Lady of the Pillar), the city's patroness. Its main feast day is October 12, and the celebration is closely connected with Fort Pilar.</p>
                <h3>Festival activities</h3>
                <ul>
                    <li><strong>Regatta de Zamboanga:</strong> boat races featuring colorful vintas and the region's maritime traditions.</li>
                    <li><strong>Street dancing and cultural presentations:</strong> local music, dance, costumes, and traditions.</li>
                    <li><strong>Religious activities:</strong> Masses, processions, and visits to Fort Pilar.</li>
                    <li><strong>Food festivals and community events:</strong> local dishes, creativity, and talent.</li>
                </ul>
                <h3>Other celebrations</h3>
                <p>Dia de la Ciudad de Zamboanga, celebrated on June 23, commemorates the city's founding and the laying of Fort Pilar's cornerstone in 1635. Dia del Chavacano recognizes the language's place in Zamboanga's identity through activities such as language competitions, cultural presentations, and educational programs. These gatherings encourage participation, cultural exchange, and community connection.</p>`
        },
        food: {
            title: "A Taste of Zamboanga",
            href: "local%20food.html",
            linkText: "Explore local food",
            content: `
                <p>Zamboanga's food reflects Chavacano, Spanish, Tausug, Sama, Yakan, and other local influences. Its coastal location also makes seafood an important part of meals.</p>
                <ul>
                    <li><strong>Curacha:</strong> spanner crab commonly served with a savory coconut-based Alavar-style sauce, crab roe, garlic, ginger, and spices; it reflects coastal fishing and seafood traditions.</li>
                    <li><strong>Itum na Tiyula (Tiyula Itum):</strong> a Tausug beef or goat soup made dark with roasted or charred coconut and flavored with aromatics; traditionally served at gatherings and special occasions.</li>
                    <li><strong>Satti:</strong> grilled beef or chicken skewers with thick, spicy reddish-orange sauce, commonly eaten with ta'mu or puso rice cakes; a popular breakfast and everyday food.</li>
                    <li><strong>Knickerbocker:</strong> a chilled dessert of fresh tropical fruit, nata de coco, syrup, ice cream, and other toppings.</li>
                    <li><strong>Lokot-Lokot:</strong> crisp, rolled rice-flour delicacy associated particularly with Sama-Banguingui and Muslim communities; served during Eid al-Fitr and other celebrations.</li>
                    <li><strong>Tamal:</strong> glutinous rice with coconut milk and seasonings, wrapped in banana leaves and steamed; fillings and family recipes vary.</li>
                    <li><strong>Baulu (Bawlu):</strong> a soft, sweet egg cake associated with Tausug and wider Bangsamoro food traditions.</li>
                    <li><strong>Fresh seafood:</strong> locally caught fish, crabs, prawns, squid, and shellfish prepared in different ways.</li>
                </ul>
                <p>Food brings people together at festivals, religious celebrations, family gatherings, and special occasions. Recipes also help families pass culinary knowledge between generations.</p>`
        },
        language: {
            title: "Chavacano de Zamboanga",
            href: "language.html",
            linkText: "Learn about Chavacano",
            content: `
                <p>Chavacano de Zamboanga is a Spanish-based creole spoken primarily in Zamboanga City. It developed through interactions among Spanish colonizers, local communities, and speakers of different languages during the Spanish colonial period. Linguistic research suggests its roots developed around the beginning of the 17th century in the Manila-Cavite area before it spread to Zamboanga and developed as a local variety.</p>
                <p>Chavacano includes many Spanish-derived words as well as influences from Cebuano, Hiligaynon, Tagalog, and other Philippine languages. It is a distinct language, not simply incorrect Spanish. People use it in everyday communication, education, and community life; it also carries stories, expressions, and a sense of identity.</p>
                <h3>Examples from the research guide</h3>
                <ul>
                    <li><strong>Buenos dias</strong> — Good morning</li>
                    <li><strong>Buenas tardes</strong> — Good afternoon</li>
                    <li><strong>Gracias</strong> — Thank you</li>
                    <li><strong>Como tu?</strong> — How are you?</li>
                    <li><strong>Ta ama yo contigo</strong> — I love you</li>
                </ul>
                <p>Preserving and passing on Chavacano helps younger generations stay connected to the city's historical experiences and community heritage.</p>`
        },
        landmarks: {
            title: "Stories in Our Landmarks",
            href: "History.html",
            linkText: "Explore history and landmarks",
            content: `
                <p>Zamboanga's landmarks represent its colonial past, religious traditions, political development, and cultural diversity.</p>
                <h3>Fort Pilar</h3>
                <p>Officially Real Fuerza de Nuestra Señora del Pilar de Zaragoza, Fort Pilar was established on June 23, 1635. Its construction was supervised by Jesuit priest-engineer Father Melchor de Vera. Built as a military defense structure, it later became associated with devotion to Our Lady of the Pillar and now serves as a historical and cultural site.</p>
                <h3>Other landmarks</h3>
                <ul>
                    <li><strong>Taluksangay Mosque:</strong> built in 1885 by Hadji Abdullah Maas Nuno; an important place of Islamic worship and regional heritage.</li>
                    <li><strong>Zamboanga City Hall:</strong> a historic government building associated with civic and administrative development.</li>
                    <li><strong>Plaza Pershing:</strong> a downtown public plaza associated with the city's development during the American period.</li>
                    <li><strong>Pasonanca Park:</strong> a public recreational and natural attraction.</li>
                    <li><strong>Pettit Barracks:</strong> a historic military site associated with the American military presence.</li>
                </ul>
                <p>Together, these places preserve different parts of Zamboanga's history, including Spanish colonial influence, Islamic heritage, and civic and military development.</p>`
        },
        crafts: {
            title: "Traditions of Zamboanga",
            href: "tradition.html#yakan-weaving",
            linkText: "Explore local crafts",
            content: `
                <p>Zamboanga's arts and crafts include weaving, embroidery, traditional clothing, basket-making, and other handmade products from its different communities.</p>
                <h3>Yakan weaving and clothing</h3>
                <p>Yakan weaving, called <em>tennun</em>, uses carefully arranged colored threads to create intricate geometric patterns. Traditionally woven with cotton and made on looms including backstrap looms, the textiles are used for clothing, accessories, and household items. The craft carries family knowledge and cultural identity; the Yakan Weaving Center in Upper Calarian is a place where it is practiced, displayed, and promoted.</p>
                <p>Yakan clothing can include the women's square head covering <em>saputangan</em>, the headcloth <em>pis</em>, and the wraparound cloth <em>pinantupan</em>. Tausug textiles include the distinctively patterned <em>pis siyabit</em>. Such garments and accessories may be worn or displayed at cultural events, weddings, and ceremonies.</p>
                <h3>Other traditional arts</h3>
                <ul>
                    <li>Subanen woven baskets and bags demonstrate knowledge of natural materials and practical design.</li>
                    <li>Yakan handwoven accessories include bags, wallets, table runners, and placemats.</li>
                    <li>Vinta-inspired artwork reflects the maritime symbol's colorful sails.</li>
                    <li>Traditional instruments and cultural objects represent community practices.</li>
                </ul>
                <p>These arts preserve community creativity and identity, provide livelihood opportunities, and help younger generations learn inherited skills and stories.</p>`
        },
        customs: {
            title: "Community and Belonging",
            href: "community.html#communities",
            linkText: "Explore community life",
            content: `
                <p>Zamboanga City is home to Chavacano, Tausug, Sama, Yakan, Subanen, Visayan, and other cultural communities. Their different experiences and identities contribute to the city's diverse community life.</p>
                <h3>Shared community life</h3>
                <p>Family occasions and community activities create opportunities to reconnect, share experiences, and strengthen relationships. Practices and customs vary between groups and families.</p>
                <h3>Respect and belonging</h3>
                <p>Listening, understanding differences, and appreciating each community help build a stronger sense of belonging. No single language, tradition, or group represents every resident.</p>`
        }
    };

    const cultureModal = document.getElementById("culture-modal");
    const cultureModalTitle = document.getElementById("culture-modal-title");
    const cultureModalContent = document.getElementById("culture-modal-content");
    const cultureModalLink = document.getElementById("culture-modal-link");

    if (cultureModal && cultureModalTitle && cultureModalContent && cultureModalLink) {
        let lastDetailTrigger = null;
        let lastDetailScrollY = 0;
        const closeModal = () => cultureModal.close();

        document.querySelectorAll("[data-detail]").forEach((trigger) => {
            trigger.addEventListener("click", () => {
                const detail = cultureDetails[trigger.dataset.detail];
                if (!detail) {
                    console.error(`Missing culture detail: ${trigger.dataset.detail}`);
                    return;
                }

                lastDetailTrigger = trigger;
                lastDetailScrollY = window.scrollY;
                activeCultureCard = trigger.closest(".culture-card");
                cultureModalTitle.textContent = detail.title;
                cultureModalContent.innerHTML = detail.content;
                cultureModalLink.href = detail.href;
                cultureModalLink.textContent = detail.linkText;
                cultureModal.showModal();
            });
        });

        cultureModal.querySelectorAll(".culture-modal__close, [data-close-modal]").forEach((button) => {
            button.addEventListener("click", closeModal);
        });
        const returnHomeButton = cultureModal.querySelector("[data-return-home]");
        if (returnHomeButton) {
            returnHomeButton.addEventListener("click", closeModal);
        }
        cultureModal.addEventListener("click", (event) => {
            if (event.target === cultureModal) closeModal();
        });
        cultureModal.addEventListener("close", () => {
            if (lastDetailTrigger && lastDetailTrigger.isConnected) lastDetailTrigger.focus();
            window.scrollTo({
                top: lastDetailScrollY,
                behavior: reducedMotion ? "auto" : "smooth"
            });
        });
    }

    const menuButton = document.querySelector(".menu-btn[aria-controls]");
    if (menuButton) {
        const menu = document.getElementById(menuButton.getAttribute("aria-controls"));
        if (menu) {
            const closeMenu = (restoreFocus = false) => {
                menu.classList.remove("show");
                menuButton.setAttribute("aria-expanded", "false");
                if (restoreFocus) menuButton.focus();
            };

            menuButton.addEventListener("click", () => {
                const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
                menuButton.setAttribute("aria-expanded", String(!isExpanded));
                menu.classList.toggle("show", !isExpanded);
            });

            menu.querySelectorAll("a").forEach((link) => {
                link.addEventListener("click", () => closeMenu());
            });

            document.addEventListener("click", (event) => {
                if (
                    event.target instanceof Node
                    && !menuButton.contains(event.target)
                    && !menu.contains(event.target)
                ) {
                    closeMenu();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
                    closeMenu(true);
                }
            });
        }
    }

    const siteMenu = document.querySelector(".site-menu");
    if (siteMenu) {
        siteMenu.querySelectorAll(".site-menu__panel a").forEach((link) => {
            link.addEventListener("click", () => {
                siteMenu.open = false;
            });
        });

        document.querySelectorAll('a[href="#home"]').forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                siteMenu.open = false;
                window.scrollTo({
                    top: 0,
                    behavior: reducedMotion ? "auto" : "smooth"
                });
            });
        });

        document.addEventListener("click", (event) => {
            if (event.target instanceof Node && !siteMenu.contains(event.target)) {
                siteMenu.open = false;
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && siteMenu.open) {
                siteMenu.open = false;
                siteMenu.querySelector("summary")?.focus();
            }
        });
    }

    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Page scroll progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", "0");
    document.body.append(progress);

    const backToTop = document.createElement("button");
    backToTop.className = "back-to-top";
    backToTop.type = "button";
    backToTop.setAttribute("aria-label", "Back to top");
    backToTop.setAttribute("title", "Back to top");
    backToTop.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.append(backToTop);

    let updateScheduled = false;
    const updateScrollControls = () => {
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progressValue = scrollableHeight > 0
            ? Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100))
            : 0;

        progress.style.transform = `scaleX(${progressValue / 100})`;
        progress.setAttribute("aria-valuenow", String(progressValue));
        backToTop.classList.toggle("is-visible", window.scrollY > 420);
        updateScheduled = false;
    };

    window.addEventListener("scroll", () => {
        if (!updateScheduled) {
            updateScheduled = true;
            window.requestAnimationFrame(updateScrollControls);
        }
    }, { passive: true });

    window.addEventListener("resize", updateScrollControls, { passive: true });
    backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });

    updateScrollControls();
})();
