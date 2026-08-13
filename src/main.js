import "./style.css";

const modules = import.meta.glob("../data/**/*.json", { eager: true });

function loadJson(path, fallback = []) {
    return modules[path]?.default || fallback;
}

const pcData = loadJson("../data/pc/uploaded_short.json", []);
const phoneData = loadJson("../data/phone/uploaded_short.json", []);

const ITEMS_PER_PAGE = 20;

// ── View counter for star popup ──
let viewCount = 0;
const POPUP_THRESHOLD = 10;
let popupShown = false;

const isMobileOrTablet =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
    ) || window.innerWidth <= 768;

let currentTab = isMobileOrTablet ? "phone" : "pc";
let currentPage = 1;
let activeMobileOverlay = null;

const galleryEl = document.getElementById("gallery");
const paginationEl = document.getElementById("pagination");
const tabPcBtn = document.getElementById("tab-pc");
const tabPhoneBtn = document.getElementById("tab-phone");
const resBadgeEl = document.getElementById("res-badge");
const starCountEl = document.getElementById("star-count");

tabPcBtn.addEventListener("click", () => switchTab("pc"));
tabPhoneBtn.addEventListener("click", () => switchTab("phone"));

// ── Popup functions ──
function showStarPopup(callback) {
    if (popupShown && !callback) return;
    popupShown = true;
    isAwaitingStarAction = true;
    const popup = document.getElementById("star-popup");
    if (popup) {
        popup.classList.remove("hidden");
        popup.classList.add("flex");
        popup.dataset.callback = callback ? "true" : "false";
        if (callback) {
            popup.dataset.callbackFunc = callback.name || "showCopyPopup";
        }
    }
}

function hideStarPopup() {
    const popup = document.getElementById("star-popup");
    if (popup) {
        popup.classList.add("hidden");
        popup.classList.remove("flex");

        if (isAwaitingStarAction && popup.dataset.callback === "true") {
            isAwaitingStarAction = false;
            setTimeout(showCopyPopup, 300);
        }
        popup.dataset.callback = "false";
        delete popup.dataset.callbackFunc;
    }
}

// ── Copy All Links functionality ──
let isAwaitingStarAction = false;

async function showCopyPopup() {
    const dataset = currentTab === "pc" ? pcData : phoneData;
    const items = Array.isArray(dataset) ? dataset : dataset?.items || [];

    const totalCount = items.length;
    const totalSizeBytes = items.reduce(
        (sum, item) => sum + (item.size_bytes || 0),
        0,
    );
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

    document.getElementById("copy-total-count").textContent = totalCount;
    document.getElementById("copy-total-size").textContent =
        `${totalSizeMB} MB`;
    document.getElementById("copy-count-text").textContent = totalCount;

    const copyPopup = document.getElementById("copy-popup");
    copyPopup.classList.remove("hidden");
    copyPopup.classList.add("flex");
}

function hideCopyPopup() {
    const copyPopup = document.getElementById("copy-popup");
    copyPopup.classList.add("hidden");
    copyPopup.classList.remove("flex");
}

async function copyAllLinks() {
    const dataset = currentTab === "pc" ? pcData : phoneData;
    const items = Array.isArray(dataset) ? dataset : dataset?.items || [];

    const urls = items.map((item) => item.original_url || item.md_url);
    const textToCopy = urls.join("\n");

    try {
        await navigator.clipboard.writeText(textToCopy);

        const btn = document.getElementById("copy-action-btn");
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Copied!";
        btn.classList.add("bg-green-500", "hover:bg-green-400");
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove("bg-green-500", "hover:bg-green-400");
        }, 2000);

        setTimeout(hideCopyPopup, 1500);
    } catch (err) {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);

        const btn = document.getElementById("copy-action-btn");
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Copied!";
        btn.classList.add("bg-green-500", "hover:bg-green-400");
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove("bg-green-500", "hover:bg-green-400");
        }, 2000);

        setTimeout(hideCopyPopup, 1500);
    }
}

// Close popup when clicking outside
document.addEventListener("click", (e) => {
    const popup = document.getElementById("star-popup");
    if (popup && !popup.classList.contains("hidden")) {
        if (e.target === popup) {
            hideStarPopup();
        }
    }

    const copyPopup = document.getElementById("copy-popup");
    if (copyPopup && !copyPopup.classList.contains("hidden")) {
        if (e.target === copyPopup) {
            hideCopyPopup();
        }
    }
});

// Close button for star popup
document.getElementById("popup-close")?.addEventListener("click", () => {
    const popup = document.getElementById("star-popup");
    if (popup.dataset.callback === "true") {
        isAwaitingStarAction = false;
        popup.dataset.callback = "false";
        hideStarPopup();
    } else {
        hideStarPopup();
    }
});

// Star popup GitHub link
document
    .getElementById("star-popup-github-link")
    ?.addEventListener("click", (e) => {
        const popup = document.getElementById("star-popup");
        if (popup.dataset.callback === "true") {
            setTimeout(() => {
                isAwaitingStarAction = false;
                popup.dataset.callback = "false";
                hideStarPopup();
                setTimeout(showCopyPopup, 300);
            }, 500);
        }
    });

// ── Copy All Links Button ──
document.getElementById("copy-all-btn")?.addEventListener("click", () => {
    showStarPopup(showCopyPopup);
});

// Copy action button
document
    .getElementById("copy-action-btn")
    ?.addEventListener("click", copyAllLinks);

// Copy popup close
document
    .getElementById("copy-popup-close")
    ?.addEventListener("click", hideCopyPopup);

// ── Increment view counter ──
function incrementViewCount() {
    viewCount++;
    if (viewCount >= POPUP_THRESHOLD) {
        showStarPopup();
    }
}

async function fetchRepoStars() {
    try {
        const response = await fetch(
            "https://api.github.com/repos/AbolfazlFa7/Wallpapers",
        );
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Repository not found or private");
            }
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (starCountEl) {
            starCountEl.textContent = data.stargazers_count ?? "0";
        }
    } catch (error) {
        console.error("Error fetching stars:", error.message);
        if (starCountEl) {
            starCountEl.textContent = "?";
        }
    }
}

async function downloadImage(url, filename = "wallpaper.jpg") {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        incrementViewCount();
    } catch (error) {
        console.error("Download failed, opening fallback tab:", error);
        window.open(url, "_blank");
        incrementViewCount();
    }
}

function updateBadge() {
    if (!resBadgeEl) return;
    if (currentTab === "pc") {
        resBadgeEl.innerHTML = `<span>1920</span><span class="text-purple-400 font-normal">×</span><span>1080</span>`;
    } else {
        resBadgeEl.innerHTML = `<span>1080</span><span class="text-purple-400 font-normal">×</span><span>2400</span>`;
    }
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    if (tab === "pc") {
        tabPcBtn.className =
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400/30";
        tabPhoneBtn.className =
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all text-purple-300 hover:text-white hover:bg-purple-900/30";
    } else {
        tabPhoneBtn.className =
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400/30";
        tabPcBtn.className =
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all text-purple-300 hover:text-white hover:bg-purple-900/30";
    }

    updateBadge();
    render();
}

function render() {
    const rawData = currentTab === "pc" ? pcData : phoneData;
    const dataset = Array.isArray(rawData) ? rawData : rawData?.items || [];

    const totalPages = Math.ceil(dataset.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = dataset.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    galleryEl.className =
        currentTab === "pc"
            ? "grid grid-cols-1 md:grid-cols-2 gap-8 w-[90%] mx-auto animate-fade-in"
            : "grid grid-cols-1 md:grid-cols-3 gap-8 w-[85%] mx-auto animate-fade-in";

    if (pageItems.length === 0) {
        galleryEl.innerHTML = `<div class="col-span-full text-center py-20 text-purple-300/50 text-lg">Coming Soon !</div>`;
        paginationEl.innerHTML = "";
        return;
    }

    galleryEl.innerHTML = pageItems
        .map(
            (item, index) => `
    <div class="group relative rounded-2xl overflow-hidden bg-[#160f24] border border-purple-900/40 hover:border-purple-500/60 ${currentTab === "pc" ? "aspect-video" : "aspect-[9/16]"} shadow-2xl hover:shadow-purple-900/20 transition-all duration-300 cursor-pointer card-item w-full" data-index="${index}">
      <img src="${item.md_url}" alt="Wallpaper" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
      
      <div class="overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6 pointer-events-none group-hover:pointer-events-auto">
        <div></div>

        <div class="flex items-center justify-between w-full">
          <span class="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-purple-950/80 text-purple-200 border border-purple-500/30 backdrop-blur-md shadow-md">
            ${item.size || "N/A"}
          </span>

          <button data-download="${item.original_url}" 
                  class="download-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-950/50 hover:shadow-purple-600/40 border border-purple-400/30 transition-all duration-200 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>
    </div>
  `,
        )
        .join("");

    renderPagination(totalPages);
    attachCardEvents(pageItems);
}

function attachCardEvents(items) {
    const cards = document.querySelectorAll(".card-item");

    cards.forEach((card, idx) => {
        const item = items[idx];
        const overlay = card.querySelector(".overlay");
        const downloadBtn = card.querySelector(".download-btn");

        downloadBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            const downloadUrl = downloadBtn.getAttribute("data-download");
            const fileName = downloadUrl.split("/").pop() || "wallpaper.jpg";
            downloadImage(downloadUrl, fileName);
        });

        card.addEventListener("click", (e) => {
            if (e.target.closest(".download-btn")) return;

            const isTouchDevice =
                window.matchMedia("(pointer: coarse)").matches;

            if (isTouchDevice) {
                if (activeMobileOverlay !== overlay) {
                    if (activeMobileOverlay)
                        activeMobileOverlay.classList.remove(
                            "opacity-100",
                            "pointer-events-auto",
                        );
                    overlay.classList.add("opacity-100", "pointer-events-auto");
                    activeMobileOverlay = overlay;
                } else {
                    window.open(item.original_url, "_blank");
                    incrementViewCount();
                }
            } else {
                window.open(item.original_url, "_blank");
                incrementViewCount();
            }
        });
    });
}

function getPaginationRange(current, total) {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (
        let i = Math.max(2, current - delta);
        i <= Math.min(total - 1, current + delta);
        i++
    ) {
        range.push(i);
    }

    if (current - delta > 2) {
        rangeWithDots.push(1, "...");
    } else {
        rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
        rangeWithDots.push("...", total);
    } else if (total > 1) {
        rangeWithDots.push(total);
    }

    return rangeWithDots;
}

function renderPagination(totalPages) {
    if (totalPages <= 1) {
        paginationEl.innerHTML = "";
        return;
    }

    const pages = getPaginationRange(currentPage, totalPages);

    let html = `
        <button id="prev-page" ${currentPage === 1 ? "disabled" : ""} 
                class="px-4 py-2 rounded-xl bg-purple-950/60 text-purple-200 border border-purple-800/40 disabled:opacity-30 hover:bg-purple-800/50 transition">
            Previous
        </button>
        <div class="flex items-center gap-2">
    `;

    pages.forEach((p) => {
        if (p === "...") {
            html += `<span class="px-2 py-1 text-purple-400">...</span>`;
        } else {
            const isActive = p === currentPage;
            html += `
                <button data-page="${p}" 
                        class="page-num-btn w-10 h-10 rounded-xl font-medium text-sm transition-all border ${
                            isActive
                                ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-900/50 scale-105"
                                : "bg-purple-950/40 text-purple-300 border-purple-800/40 hover:bg-purple-800/50 hover:text-white"
                        }">
                    ${p}
                </button>
            `;
        }
    });

    html += `
        </div>
        <button id="next-page" ${currentPage === totalPages ? "disabled" : ""} 
                class="px-4 py-2 rounded-xl bg-purple-950/60 text-purple-200 border border-purple-800/40 disabled:opacity-30 hover:bg-purple-800/50 transition">
            Next
        </button>
    `;

    paginationEl.innerHTML = html;

    document.getElementById("prev-page")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            render();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });

    document.getElementById("next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            render();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });

    document.querySelectorAll(".page-num-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const targetPage = Number(
                e.currentTarget.getAttribute("data-page"),
            );
            if (targetPage && targetPage !== currentPage) {
                currentPage = targetPage;
                render();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });
}

switchTab(currentTab);
fetchRepoStars();
