// =============================================================================
// CLOUDINARY CONFIG — replace these two values with your own from
// cloudinary.com (Dashboard for cloud name, Settings > Upload for preset).
// =============================================================================
const CLOUDINARY_CLOUD_NAME = "w31w396i";
const CLOUDINARY_UPLOAD_PRESET = "otizkiddiesworld";

async function uploadToCloudinary(file) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary upload failed: ${errText}`);
    }

    const data = await response.json();
    return data.secure_url;
}

const ADMIN_EMAIL = "admin@otizkiddiesworld.com";

function ensureAdminAccess(user) {
    if (!user || !user.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "/HTML/signin.html?admin=1";
        return false;
    }
    return true;
}

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================================
    // 1. SIDEBAR TAB SWITCHER — zero external dependencies. This is set up
    //    before anything else, and nothing below it can prevent it from
    //    working, even if Firebase never loads.
    // =====================================================================
    const sidebar = document.getElementById("sidebar");
    const links = document.querySelectorAll(".sidebar-menu a[data-tab]");
    const sections = document.querySelectorAll(".tab-section");

    function activateTab(tabName, linkElement) {
        if (!tabName) return;
        const currentActive = document.querySelector(".sidebar-menu li.active");
        if (currentActive) currentActive.classList.remove("active");

        const item = linkElement.closest("li");
        if (item) item.classList.add("active");

        sections.forEach(section => {
            section.classList.toggle("active", section.id === tabName);
        });

        if (sidebar && window.innerWidth <= 768) sidebar.classList.remove("open");
    }

    links.forEach(link => {
        link.addEventListener("click", (e) => {
            const tabName = link.getAttribute("data-tab");
            if (!tabName) return;
            e.preventDefault();
            activateTab(tabName, link);
        });
    });

    const menuToggle = document.getElementById("menuToggle");
    const mainWrapper = document.querySelector(".main-wrapper");
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("open");
        });
        if (mainWrapper) {
            mainWrapper.addEventListener("click", () => {
                if (sidebar.classList.contains("open")) sidebar.classList.remove("open");
            });
        }
    }

    // =====================================================================
    // 2. PRODUCT UPLOADER + ALL FIREBASE-DEPENDENT FEATURES — loaded via
    //    DYNAMIC import, wrapped in try/catch. If Firebase fails to load
    //    for any reason, this fails quietly and the sidebar keeps working.
    //
    //    A loader lock is held (window.showLoader) from the moment this
    //    block starts until EVERY Firestore fetch below — orders,
    //    announcement, messages, users, products — has finished, via
    //    Promise.all. Each individual loader already catches its own
    //    errors internally, so Promise.all always resolves (never
    //    rejects) and the lock is released in a `finally`, guaranteeing
    //    it's released even if something above throws unexpectedly.
    // =====================================================================
    (async () => {
        const hasLoader = typeof window.showLoader === "function" && typeof window.hideLoader === "function";
        if (hasLoader) window.showLoader();

        let firebaseService;
        try {
            firebaseService = await import("./firebase-service.js");
        } catch (err) {
            console.error("Otizadmin.js: Firebase features unavailable, continuing without them:", err);
            if (hasLoader) window.hideLoader();
            return;
        }

        const {
            getUsers,
            onAuthStateChanged,
            getProducts,
            addProduct,
            deleteProduct,
            getOrders,
            updateOrderStatus,
            getAnnouncement,
            setAnnouncement,
            getMessages
        } = firebaseService;

        // --- AUTH CHECK ---
        try {
            onAuthStateChanged((user) => {
                ensureAdminAccess(user);
            });
        } catch (err) {
            console.error("Auth check failed:", err);
        }

        // --- ORDERS TABLE (Firestore) ---
        async function renderOrdersTable() {
            const orderRows = document.getElementById("order-rows");
            if (!orderRows) return;

            try {
                const orders = await getOrders();

                // Total Revenue = sum of every order's total (which already
                // includes each item's price × quantity, plus the delivery
                // fee line item added at checkout).
                const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                const revenueEl = document.getElementById("total-revenue");
                if (revenueEl) revenueEl.textContent = `₦${revenue.toLocaleString()}`;

                const countOrdersEl = document.getElementById("count-orders");
                if (countOrdersEl) {
                    countOrdersEl.textContent = orders.filter(o => o.status === "Pending").length;
                }

                orderRows.innerHTML = "";

                orders.forEach((order) => {
                    let itemsHTML = "";
                    (order.items || []).forEach(item => {
                        itemsHTML += `
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
                                <img src="${item.image || '/image/default.jpg'}" style="width:35px; height:35px; border-radius:4px; object-fit:cover;">
                                <span>${item.name} (x${item.quantity || 1}) — ₦${Number(item.price || 0).toLocaleString()}</span>
                            </div>
                        `;
                    });

                    const placedAt = order.createdAt && order.createdAt.toDate
                        ? order.createdAt.toDate().toLocaleString()
                        : "—";

                    const isDelivered = order.status === "Delivered";

                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${order.id}</strong><br><small style="color:#6b7280;">${placedAt}</small></td>
                        <td>
                            ${order.customer?.name || ''}<br>
                            <small style="color:#6b7280;">${order.customer?.email || ''}</small><br>
                            <small style="color:#6b7280;"><i class="fas fa-phone"></i> ${order.customer?.phone || ''}</small>
                        </td>
                        <td>${itemsHTML}</td>
                        <td style="max-width:200px; white-space:normal; word-break:break-word;">${order.customer?.address || ''}</td>
                        <td><strong>₦${Number(order.total || 0).toLocaleString()}</strong></td>
                        <td>
                            <span class="badge ${isDelivered ? 'badge-success' : 'badge-pending'}">
                                ${order.status || 'Pending'}
                            </span>
                            ${!isDelivered ? `<button class="action-btn status-btn" data-id="${order.id}" style="margin-left:8px; padding:4px 8px; font-size:0.75rem; background:#10b981;">Mark Delivered</button>` : ''}
                        </td>
                    `;
                    orderRows.appendChild(tr);
                });

                orderRows.querySelectorAll(".status-btn").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        btn.disabled = true;
                        btn.textContent = "Updating...";
                        try {
                            await updateOrderStatus(btn.getAttribute("data-id"), "Delivered");
                            await renderOrdersTable();
                        } catch (err) {
                            console.error("Failed to mark order delivered:", err);
                            alert("Couldn't update this order. Check the console for details.");
                            btn.disabled = false;
                            btn.textContent = "Mark Delivered";
                        }
                    });
                });
            } catch (err) {
                console.error("Failed loading orders from Firestore:", err);
            }
        }

        // --- ANNOUNCEMENT BANNER (Firestore) ---
        async function initAnnouncementForm() {
            const announcementForm = document.getElementById("announcementForm");
            if (!announcementForm) return;

            try {
                const currentText = await getAnnouncement();
                const bannerInput = document.getElementById("bannerText");
                if (bannerInput && currentText) bannerInput.value = currentText;
            } catch (err) {
                console.error("Failed to load current announcement:", err);
            }

            announcementForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const text = document.getElementById("bannerText").value;
                const submitBtn = announcementForm.querySelector(".submit-btn");
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Updating...";
                }
                try {
                    await setAnnouncement(text);
                    alert("Announcement updated!");
                } catch (err) {
                    console.error("Failed to update announcement:", err);
                    alert("Couldn't update the announcement. Check the console for details.");
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Update Header Announcement Banner";
                    }
                }
            });
        }

        // --- MESSAGES / CONTACT ENQUIRIES (Firestore) ---
        async function loadMessages() {
            const list = document.getElementById("message-list");
            if (!list) return;

            try {
                const messages = await getMessages();

                if (!messages.length) {
                    list.innerHTML = '<p style="color:#6b7280;">No messages yet.</p>';
                    return;
                }

                // Newest first
                messages.sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return bTime - aTime;
                });

                list.innerHTML = "";
                messages.forEach((msg) => {
                    const receivedAt = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : "—";

                    // Only phone numbers can open a WhatsApp chat — email-only
                    // enquiries just don't get the reply button.
                    let whatsappHref = "";
                    if (msg.phone) {
                        const digitsOnly = msg.phone.replace(/[^\d]/g, "");
                        const prefill = encodeURIComponent(
                            `Hi ${msg.name || ""}, thanks for reaching out to OTIZKIDDIESWORLD! Regarding your message: "${msg.text || ""}"`
                        );
                        whatsappHref = `https://wa.me/${digitsOnly}?text=${prefill}`;
                    }

                    const div = document.createElement("div");
                    div.className = "msg-card";
                    div.innerHTML = `
                        <div class="msg-meta">
                            <strong>Sender: ${msg.name || "Unknown"}</strong>
                            <span>Email: ${msg.email || "—"}</span>
                            <span style="color:#6b7280;">${receivedAt}</span>
                        </div>
                        <p class="msg-content">${msg.text || ""}</p>
                        ${whatsappHref ? `<a href="${whatsappHref}" target="_blank" class="action-btn" style="display:inline-flex; text-decoration:none; margin-top:8px; background:#25D366;"><i class="fab fa-whatsapp"></i>&nbsp; Reply on WhatsApp</a>` : ""}
                    `;
                    list.appendChild(div);
                });
            } catch (err) {
                console.error("Failed loading messages from Firestore:", err);
                list.innerHTML = '<p style="color:#dc2626;">Couldn\'t load messages. Check the console for details.</p>';
            }
        }

        // --- REGISTERED USERS TABLE ---
        async function loadUsersTable() {
            try {
                const users = await getUsers();

                const countUsersEl = document.getElementById("count-users");
                if (countUsersEl) countUsersEl.textContent = users.length;

                const userRows = document.getElementById("user-rows");
                if (userRows) {
                    userRows.innerHTML = "";
                    users.forEach(user => {
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td>${user.name || ''}</td>
                            <td>${user.email || ''}</td>
                            <td><span class="badge badge-success">${user.status || 'Registered'}</span></td>
                        `;
                        userRows.appendChild(tr);
                    });
                }
            } catch (err) {
                console.error("Failed loading Firebase users:", err);
            }
        }

        // --- PRODUCT UPLOADER (multi-image, images -> Cloudinary, data -> Firestore) ---
        const modal = document.getElementById("productModal");
        const btnNewProduct = document.getElementById("btnNewProduct");
        const closeModal = document.getElementById("closeModal");
        const fileZone = document.querySelector(".file-drop-zone");
        const fileInput = document.getElementById("pImages");
        const previewGrid = document.getElementById("imagePreviewGrid");
        const newProductForm = document.getElementById("newProductForm");
        const productRows = document.getElementById("product-rows");

        if (btnNewProduct && modal) btnNewProduct.addEventListener("click", () => modal.style.display = "flex");
        if (closeModal && modal) closeModal.addEventListener("click", () => modal.style.display = "none");

        // Holds File objects so they can be uploaded to Cloudinary
        let uploadedFiles = [];

        function renderPreviews() {
            if (!previewGrid) return;
            previewGrid.innerHTML = "";
            uploadedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const div = document.createElement("div");
                    div.className = "preview-wrapper";
                    div.innerHTML = `
                        <img src="${event.target.result}">
                        <button type="button" class="remove-preview-btn" data-index="${index}">&times;</button>
                    `;
                    previewGrid.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        }

        if (fileZone && fileInput && previewGrid) {
            fileZone.addEventListener("click", () => fileInput.click());

            fileInput.addEventListener("change", (e) => {
                uploadedFiles = uploadedFiles.concat(Array.from(e.target.files));
                renderPreviews();
            });

            previewGrid.addEventListener("click", (e) => {
                if (e.target.classList.contains("remove-preview-btn")) {
                    const index = parseInt(e.target.getAttribute("data-index"));
                    uploadedFiles.splice(index, 1);
                    renderPreviews();
                }
            });
        }

        async function loadAdminProducts() {
            if (!productRows) return;
            try {
                const list = await getProducts();
                productRows.innerHTML = "";
                list.forEach((prod) => {
                    let imagesHTML = '<div class="table-img-container">';
                    if (prod.images && prod.images.length > 0) {
                        prod.images.forEach(imgSrc => {
                            imagesHTML += `<img src="${imgSrc}" class="table-thumbnail">`;
                        });
                    } else {
                        imagesHTML += `<img src="/image/default.jpg" class="table-thumbnail">`;
                    }
                    imagesHTML += '</div>';

                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${imagesHTML}</td>
                        <td>${prod.name}</td>
                        <td>${prod.category}</td>
                        <td>₦${Number(prod.price).toLocaleString()}</td>
                        <td>
                            <button class="del-btn" data-id="${prod.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    productRows.appendChild(tr);
                });
            } catch (err) {
                console.error("Failed loading products from Firestore:", err);
            }
        }

        if (newProductForm) {
            newProductForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const name = document.getElementById("pName").value;
                const category = document.getElementById("pCategory").value;
                const price = document.getElementById("pPrice").value;

                if (uploadedFiles.length === 0) {
                    alert("Please upload at least one image!");
                    return;
                }

                if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME" || CLOUDINARY_UPLOAD_PRESET === "YOUR_UPLOAD_PRESET") {
                    alert("Cloudinary isn't configured yet — set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET at the top of Otizadmin.js.");
                    return;
                }

                const submitBtn = newProductForm.querySelector(".submit-btn");
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Publishing...";
                }

                try {
                    // Upload every image to Cloudinary first, collect the returned URLs
                    const imageUrls = [];
                    for (const file of uploadedFiles) {
                        const url = await uploadToCloudinary(file);
                        imageUrls.push(url);
                    }

                    await addProduct({
                        name,
                        category,
                        price: Number(price),
                        images: imageUrls
                    });

                    newProductForm.reset();
                    uploadedFiles = [];
                    if (previewGrid) previewGrid.innerHTML = "";
                    if (modal) modal.style.display = "none";

                    alert("Product published! It's now visible to everyone on the site.");
                    loadAdminProducts();
                } catch (err) {
                    console.error("Failed to publish product:", err);
                    alert("Something went wrong publishing this product. Check the console for details.");
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Publish to Main Catalog";
                    }
                }
            });
        }

        if (productRows) {
            productRows.addEventListener("click", async (e) => {
                if (e.target.closest(".del-btn")) {
                    const btn = e.target.closest(".del-btn");
                    const id = btn.getAttribute("data-id");
                    if (!confirm("Remove this product for everyone?")) return;
                    try {
                        await deleteProduct(id);
                        loadAdminProducts();
                    } catch (err) {
                        console.error("Failed to delete product:", err);
                        alert("Couldn't delete this product. Check the console for details.");
                    }
                }
            });
        }

        // --- WAIT FOR EVERY DATA FETCH BEFORE RELEASING THE LOADER ---
        // Each function above already swallows its own errors internally,
        // so none of these promises reject — Promise.all always settles,
        // and the `finally` below guarantees the loader lock is released
        // even in an unexpected-throw edge case.
        try {
            await Promise.all([
                renderOrdersTable(),
                initAnnouncementForm(),
                loadMessages(),
                loadUsersTable(),
                loadAdminProducts()
            ]);
        } finally {
            if (hasLoader) window.hideLoader();
        }
    })();
});