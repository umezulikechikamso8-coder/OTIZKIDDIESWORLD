/*
  OTIZKIDDIESWORLD — Smart Global Loading Screen
  =========================================
  This version will not disappear until:
    1. The standard window 'load' event completes (CSS, images, etc.)
    2. Dynamic data fetches (like Firestore tables) explicitly report completion.
*/

(function () {
    const MIN_VISIBLE_MS = 600; // slightly bumped to allow smooth UI transitions
    let shownAt = null;
    let manualLockCount = 1; // Start with 1 lock to represent the initial page setup/rendering
    let isPageSetupDone = false;

    const style = document.createElement("style");
    style.textContent = `
        #otiz-loader-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: #fff5f8;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            transition: opacity 0.4s ease, visibility 0.4s;
        }
        #otiz-loader-overlay.otiz-loader-hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        #otiz-loader-overlay .otiz-loader-logo {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 700;
            font-size: 1.4rem;
            letter-spacing: 0.5px;
            color: #000000;
        }
        #otiz-loader-overlay .otiz-loader-spinner {
            width: 42px;
            height: 42px;
            border: 4px solid #0400ea;
            border-top-color: #dadada;
            border-radius: 50%;
            animation: otiz-loader-spin 0.8s linear infinite;
        }
        @keyframes otiz-loader-spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    function injectOverlay() {
        if (document.getElementById("otiz-loader-overlay")) return;
        const overlay = document.createElement("div");
        overlay.id = "otiz-loader-overlay";
        overlay.innerHTML = `
            <div class="otiz-loader-spinner"></div>
            <div class="otiz-loader-logo">OTIZKIDDIESWORLD</div>
        `;
        (document.body || document.documentElement).appendChild(overlay);
        if (!shownAt) shownAt = Date.now();
    }

    if (document.body) {
        injectOverlay();
    } else {
        document.addEventListener("readystatechange", function onReady() {
            if (document.body) {
                injectOverlay();
                document.removeEventListener("readystatechange", onReady);
            }
        });
    }

    function reallyHide() {
        const overlay = document.getElementById("otiz-loader-overlay");
        if (!overlay) return;
        overlay.classList.add("otiz-loader-hidden");
        setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
        }, 400);
    }

    function hideLoader() {
        if (manualLockCount > 0) manualLockCount--;
        if (manualLockCount > 0) return; // Something is still loading

        const elapsed = shownAt ? Date.now() - shownAt : MIN_VISIBLE_MS;
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
        setTimeout(reallyHide, remaining);
    }

    function showLoader() {
        manualLockCount++;
        injectOverlay();
        const overlay = document.getElementById("otiz-loader-overlay");
        if (overlay) overlay.classList.remove("otiz-loader-hidden");
    }

    // Standard window asset listener
    window.addEventListener("load", () => {
        isPageSetupDone = true;
        // Check if no asynchronous scripts locked it; otherwise clear the startup lock
        hideLoader();
    });

    // Safety net bumped to 12s just in case heavy data/image loads take a moment
    setTimeout(() => {
        reallyHide();
    }, 12000);

    window.showLoader = showLoader;
    window.hideLoader = hideLoader;
})();