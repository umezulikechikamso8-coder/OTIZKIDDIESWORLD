const DELIVERY_FEE = 1500;
const STORAGE_KEYS = ["cart", "otizCart"];
let customerBindingsReady = false;

function getPaystackPublicKey() {
    const fromWindow = (window.PAYSTACK_PUBLIC_KEY || window.paystackPublicKey || "").trim();
    if (fromWindow) return fromWindow;

    try {
        const fromStorage = (localStorage.getItem("paystackPublicKey") || "").trim();
        if (fromStorage) return fromStorage;
    } catch (error) {
        console.warn("Unable to read Paystack key from storage.", error);
    }

    try {
        const fromTestStorage = (localStorage.getItem("paystackTestPublicKey") || "").trim();
        if (fromTestStorage) return fromTestStorage;
    } catch (error) {
        console.warn("Unable to read test Paystack key from storage.", error);
    }

    return "";
}

function getStoredUser() {
    try {
        const sharedUser = localStorage.getItem("otizCurrentUser");
        if (sharedUser) {
            const parsed = JSON.parse(sharedUser);
            if (parsed) return parsed;
        }
    } catch (error) {
        console.warn("Unable to read shared user.", error);
    }

    try {
        const saved = localStorage.getItem("mock_current_user");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed) return parsed;
        }
    } catch (error) {
        console.warn("Unable to read saved user.", error);
    }

    if (window.currentUser) return window.currentUser;
    if (window.OtizFirebase?.auth?.currentUser) return window.OtizFirebase.auth.currentUser;
    return null;
}

function getCart() {
    for (const key of STORAGE_KEYS) {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (error) {
            console.warn("Unable to read cart from storage.", error);
        }
    }
    return [];
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("otizCart", JSON.stringify(cart));
}

function getCartItemQuantity(item) {
    return item.quantity || item.qty || 1;
}

function renderOrderSummary() {
    const cart = getCart();
    const itemsEl = document.getElementById("orderItems");
    const subtotalEl = document.getElementById("subtotalAmt");
    const grandEl = document.getElementById("grandTotal");

    if (!itemsEl) return;

    let subtotal = 0;
    itemsEl.innerHTML = "";

    if (!cart.length) {
        itemsEl.innerHTML = '<div class="empty-order-state">Your cart is empty. Add items to see them here.</div>';
        if (subtotalEl) subtotalEl.textContent = "₦0";
        if (grandEl) grandEl.textContent = "₦0";
        renderInvoiceTable([], 0);
        return;
    }

    cart.forEach((item) => {
        const quantity = getCartItemQuantity(item);
        const itemTotal = (item.price || 0) * quantity;
        subtotal += itemTotal;

        const div = document.createElement("div");
        div.className = "order-item";
        div.innerHTML = `
            <div class="item-thumb">${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:44px;height:44px;object-fit:cover;border-radius:10px;">` : (item.emoji || "📦")}</div>
            <div class="item-info">
                <div class="item-name">${item.name || "Product"}</div>
                <div class="item-qty">Qty: ${quantity}</div>
            </div>
            <div class="item-price">₦${itemTotal.toLocaleString()}</div>
        `;
        itemsEl.appendChild(div);
    });

    if (subtotalEl) subtotalEl.textContent = "₦" + subtotal.toLocaleString();
    if (grandEl) grandEl.textContent = "₦" + (subtotal + DELIVERY_FEE).toLocaleString();

    renderInvoiceTable(cart, subtotal);
}

function renderInvoiceTable(cart, subtotal) {
    const tbody = document.getElementById("invoiceTableBody");
    const invSub = document.getElementById("invSubtotal");
    const invTotal = document.getElementById("invTotal");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!cart.length) {
        tbody.innerHTML = '<tr><td colspan="4">No items yet.</td></tr>';
    } else {
        cart.forEach((item) => {
            const quantity = getCartItemQuantity(item);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.name || "Product"}</td>
                <td>${quantity}</td>
                <td>₦${(item.price || 0).toLocaleString()}</td>
                <td>₦${(((item.price || 0) * quantity)).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (invSub) invSub.textContent = "₦" + subtotal.toLocaleString();
    if (invTotal) invTotal.textContent = "₦" + (subtotal + DELIVERY_FEE).toLocaleString();
}

function generateInvoiceNumber() {
    return "INV-" + Date.now().toString().slice(-6);
}

function setInvoiceMeta() {
    const numEl = document.getElementById("invoiceNum");
    const dateEl = document.getElementById("invoiceDate");

    if (numEl) {
        let inv = sessionStorage.getItem("otizInvNum");
        if (!inv) {
            inv = generateInvoiceNumber();
            sessionStorage.setItem("otizInvNum", inv);
        }
        numEl.textContent = inv;
    }

    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString("en-NG", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
}

function syncCustomerToInvoice() {
    if (customerBindingsReady) return;

    const fields = ["fullname", "email", "phone", "address"];
    const invIds = ["invName", "invEmail", "invPhone", "invAddress"];

    fields.forEach((id, i) => {
        const input = document.getElementById(id);
        const inv = document.getElementById(invIds[i]);
        if (!input || !inv) return;

        input.addEventListener("input", () => {
            inv.textContent = input.value || "—";
            if (id === "fullname") {
                sessionStorage.setItem("otizCustomerName", input.value);
            }
        });

        if (input.value.trim()) {
            inv.textContent = input.value || "—";
        }
    });

    customerBindingsReady = true;
}

function populateCustomerInfo(user) {
    const nameField = document.getElementById("fullname");
    const emailField = document.getElementById("email");
    const phoneField = document.getElementById("phone");

    const displayName = user?.displayName || user?.name || user?.email || "";
    const email = user?.email || "";
    const phone = user?.phoneNumber || user?.phone || "";

    // NOTE: nameField/emailField are always readonly, so nothing else on
    // this page can legitimately change them except a real signed-in
    // user's data. If we have that data, it should always win — even if
    // the field already has a value cached from sessionStorage (e.g. a
    // leftover name from testing under a different account earlier in
    // this browser tab). Only fall back to preserving the existing value
    // when there's genuinely no signed-in user to pull from.
    if (nameField) {
        nameField.readOnly = true;
        if (displayName) {
            nameField.value = displayName;
        }
    }
    if (emailField) {
        emailField.readOnly = true;
        if (email) {
            emailField.value = email;
        }
    }
    if (phoneField && !phoneField.value) {
        phoneField.value = phone;
    }

    updateAccountBar(displayName || "My Username");

    const nameInput = document.getElementById("fullname");
    if (nameInput && nameInput.value) {
        const invName = document.getElementById("invName");
        if (invName) invName.textContent = nameInput.value;
        sessionStorage.setItem("otizCustomerName", nameInput.value);
    }

    const emailInput = document.getElementById("email");
    if (emailInput && emailInput.value) {
        const invEmail = document.getElementById("invEmail");
        if (invEmail) invEmail.textContent = emailInput.value;
    }

    const phoneInput = document.getElementById("phone");
    if (phoneInput && phoneInput.value) {
        const invPhone = document.getElementById("invPhone");
        if (invPhone) invPhone.textContent = phoneInput.value;
    }

    const addressInput = document.getElementById("address");
    if (addressInput && addressInput.value) {
        const invAddress = document.getElementById("invAddress");
        if (invAddress) invAddress.textContent = addressInput.value;
    }
}

function updateAccountBar(name) {
    const nameEl = document.getElementById("acctDisplayName");
    const initialEl = document.getElementById("acctInitial");
    if (nameEl) nameEl.textContent = name || "My Username";
    if (initialEl) initialEl.textContent = name ? name.trim()[0].toUpperCase() : "U";
}

function updatePaymentStatus(message, type = "info") {
    const notice = document.getElementById("paymentStatusNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.className = `payment-status ${type}`;
}

function selectPayment(method) {
    const transferBox = document.getElementById("transferBox");
    const optCard = document.getElementById("opt-card");
    const optTransfer = document.getElementById("opt-transfer");

    if (optCard) {
        optCard.classList.toggle("selected", method === "card");
    }
    if (optTransfer) {
        optTransfer.classList.toggle("selected", method === "transfer");
    }

    if (transferBox) {
        transferBox.classList.toggle("visible", method === "transfer");
    }

    if (method === "card") {
        updatePaymentStatus("Card selected. Click Place Order & Pay Now to continue.", "info");
    } else if (method === "transfer") {
        updatePaymentStatus("Bank transfer selected. You will be asked to confirm after making the transfer.", "info");
    }
}

function copyAccount() {
    navigator.clipboard.writeText("9036442495").then(() => {
        showToast("Account number copied!");
    }).catch(() => {
        const tmp = document.createElement("textarea");
        tmp.value = "9036442495";
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
        showToast("Account number copied!");
    });
}

// ─────────────────────────────────────────────────────────────
// NEW: Save the completed order to Firestore so it shows up
// live in the admin panel — customer info, items, prices,
// delivery fee, and a server timestamp.
// Must run BEFORE clearCartAfterOrder(), since that wipes the
// cart this function reads from.
// ─────────────────────────────────────────────────────────────
async function saveOrderToFirestore(status) {
    try {
        const cart = getCart();
        if (!cart.length) return null;

        if (!window.OtizFirebase?.placeOrder) {
            console.warn("Firebase placeOrder unavailable — order was not saved to the admin panel.");
            return null;
        }

        const normalizedItems = cart.map((item) => ({
            name: item.name || "Product",
            price: item.price || 0,
            quantity: getCartItemQuantity(item),
            image: item.image || ""
        }));

        // Add delivery as its own line item so order.total (computed inside
        // placeOrder) matches what the customer actually saw on screen.
        normalizedItems.push({
            name: "Delivery Fee",
            price: DELIVERY_FEE,
            quantity: 1,
            image: ""
        });

        const customer = {
            name: document.getElementById("fullname")?.value.trim() || "",
            email: document.getElementById("email")?.value.trim() || "",
            phone: document.getElementById("phone")?.value.trim() || "",
            address: document.getElementById("address")?.value.trim() || ""
        };

        const orderId = await window.OtizFirebase.placeOrder(normalizedItems, customer);

        if (status && status !== "Pending" && window.OtizFirebase.updateOrderStatus) {
            await window.OtizFirebase.updateOrderStatus(orderId, status);
        }

        // Also drop a note in the admin's Messages tab so new orders are
        // easy to spot and reply to, on top of the Orders tab listing.
        // This is best-effort — if it fails, the order itself still stands.
        try {
            if (window.OtizFirebase.submitMessage) {
                const total = normalizedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
                const itemsSummary = normalizedItems
                    .map(item => `${item.name} x${item.quantity} (₦${Number(item.price).toLocaleString()})`)
                    .join(", ");

                await window.OtizFirebase.submitMessage({
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    text: `🛍️ New order placed! Order ID: ${orderId}. Items: ${itemsSummary}. Total: ₦${total.toLocaleString()}. Delivery Address: ${customer.address}.`
                });
            }
        } catch (msgError) {
            console.warn("Order placed, but the admin notification message failed to send.", msgError);
        }

        return orderId;
    } catch (error) {
        console.error("Failed to save order to Firestore:", error);
        showToast("Your order went through, but we couldn't sync it to our system. Please contact support with your invoice number.", true);
        return null;
    }
}

async function clearCartAfterOrder() {
    saveCart([]);
    localStorage.removeItem("cart");
    localStorage.removeItem("otizCart");
    if (window.localStorage) {
        window.localStorage.setItem("cart", "[]");
        window.localStorage.setItem("otizCart", "[]");
        window.localStorage.setItem("otizCartCleared", "1");
    }

    try {
        if (window.OtizFirebase?.saveCartToFirestore) {
            await window.OtizFirebase.saveCartToFirestore([]);
        }
    } catch (error) {
        console.warn("Unable to clear cart from Firestore.", error);
    }

    window.dispatchEvent(new Event("storage"));
}

function redirectToCartAfterOrder() {
    if (window.location.pathname.includes("otizcart.html")) return;
    setTimeout(() => {
        window.location.assign("otizcart.html");
    }, 1200);
}

async function confirmTransfer() {
    if (!validateForm()) return;

    const btn = document.getElementById("transferBtn");
    if (btn) {
        btn.textContent = "✓ Payment Confirmed";
        btn.style.background = "#16a34a";
        btn.disabled = true;
    }

    const statusEl = document.getElementById("invoiceStatus");
    if (statusEl) {
        statusEl.textContent = "Awaiting Confirmation";
        statusEl.style.color = "#d97706";
    }

    updateSteps(4);
    await saveOrderToFirestore("Pending");
    await clearCartAfterOrder();
    showToast("Transfer noted! We'll confirm your payment shortly.");
    redirectToCartAfterOrder();
}

function validateForm() {
    const fields = [
        { id: "fullname", label: "Full Name" },
        { id: "email", label: "Email Address" },
        { id: "phone", label: "Phone Number" },
        { id: "address", label: "Delivery Address" }
    ];

    for (const field of fields) {
        const el = document.getElementById(field.id);
        if (!el || !el.value.trim()) {
            el && el.focus();
            showToast(`Please enter your ${field.label}`, true);
            return false;
        }
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethod) {
        showToast("Please select a payment method", true);
        return false;
    }

    return true;
}

async function finishCardPayment(ref) {
    const statusEl = document.getElementById("invoiceStatus");
    if (statusEl) {
        statusEl.textContent = "Paid";
        statusEl.style.color = "#16a34a";
    }
    updateSteps(4);
    await saveOrderToFirestore("Paid");
    await clearCartAfterOrder();
    renderOrderSummary();
    updatePaymentStatus(`Payment successful! Your order is now paid. Ref: ${ref}`, "success");
    showToast("Payment successful! 🎉 Ref: " + ref);
    redirectToCartAfterOrder();
}

async function placeOrder() {
    if (!validateForm()) return;

    const method = document.querySelector('input[name="payment"]:checked');
    if (!method) return;

    if (method.value === "transfer") {
        confirmTransfer();
        return;
    }

    const email = document.getElementById("email").value.trim();
    const cart = getCart();

    if (!cart.length) {
        showToast("Your cart is empty.", true);
        return;
    }

    const sub = cart.reduce((sum, item) => sum + (item.price || 0) * getCartItemQuantity(item), 0);
    const total = (sub + DELIVERY_FEE) * 100;
    const reference = sessionStorage.getItem("otizInvNum") || generateInvoiceNumber();
    const paystackKey = getPaystackPublicKey();

    if (!paystackKey) {
        updatePaymentStatus("Card payment completed in demo mode. Your order is now marked as paid.", "success");
        await finishCardPayment(reference);
        showToast("Card payment completed in demo mode. Add your Paystack public key to switch to live card payments.", false);
        return;
    }

    if (typeof PaystackPop === "undefined" || !PaystackPop.setup) {
        showToast("Paystack is currently unavailable. Please try again shortly.", true);
        return;
    }

    updatePaymentStatus("Card payment window opened. Complete the payment in Paystack to finish your order.", "info");

    const handler = PaystackPop.setup({
        key: paystackKey,
        email,
        amount: total,
        currency: "NGN",
        ref: reference,
        metadata: {
            custom_fields: [{
                display_name: "Customer Name",
                variable_name: "customer_name",
                value: document.getElementById("fullname").value
            }]
        },
        callback: function(response) {
            finishCardPayment(response.reference || reference);
        },
        onClose: function() {
            showToast("Payment window closed. Try again when ready.", true);
        }
    });

    handler.openIframe();
}

function updateSteps(active) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById("step" + i);
        if (!el) continue;
        el.classList.remove("active", "done");
        if (i < active) el.classList.add("done");
        if (i === active) el.classList.add("active");
    }
}

function downloadInvoice() {
    const area = document.getElementById("invoicePrintArea");
    if (!area) return;

    const invNum = document.getElementById("invoiceNum").textContent;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: `OTIZ-${invNum}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(opt).from(area).save().then(() => {
        showToast("Invoice downloaded successfully!");
    });
}

function showToast(msg, isError = false) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast) return;

    toast.style.background = isError ? "#dc2626" : "#16a34a";
    toastMsg.textContent = msg;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3500);
}

function initStepTracking() {
    const infoInputs = document.querySelectorAll("#fullname, #email, #phone, #address");
    infoInputs.forEach((el) => {
        el.addEventListener("focus", () => updateSteps(1));
    });

    document.querySelectorAll('input[name="payment"]').forEach((el) => {
        el.addEventListener("change", () => updateSteps(2));
    });
}

document.addEventListener("DOMContentLoaded", function () {
    renderOrderSummary();
    setInvoiceMeta();
    syncCustomerToInvoice();
    initStepTracking();

    // NOTE: this sessionStorage restore is a legacy leftover from before
    // sign-in existed. It's now harmless: syncCheckoutState() below runs
    // after this and always overwrites the field with the real signed-in
    // user's name when one exists, so this can only "win" for a genuine
    // guest with no account — which currently can't reach checkout anyway
    // since the field is readonly. Left in place for safety, not removed.
    const savedName = sessionStorage.getItem("otizCustomerName");
    if (savedName) {
        const el = document.getElementById("fullname");
        if (el) {
            el.value = savedName;
        }
    }

    const nameEl = document.getElementById("fullname");
    if (nameEl) {
        nameEl.addEventListener("input", () => {
            sessionStorage.setItem("otizCustomerName", nameEl.value);
        });
    }

    const cardOption = document.querySelector('input[name="payment"][value="card"]');
    if (cardOption) {
        cardOption.checked = true;
        selectPayment("card");
    }

    const syncCheckoutState = () => {
        const user = getStoredUser();
        window.currentUser = user;
        populateCustomerInfo(user);
        renderOrderSummary();
    };

    syncCheckoutState();

    if (window.OtizFirebase?.onAuthStateChanged) {
        window.OtizFirebase.onAuthStateChanged((user) => {
            window.currentUser = user;
            populateCustomerInfo(user);
            renderOrderSummary();
        });
    }

    window.addEventListener("storage", (event) => {
        if (event.key === "cart" || event.key === "otizCart" || event.key === "mock_current_user") {
            syncCheckoutState();
        }
    });
});

window.placeOrder = placeOrder;
window.selectPayment = selectPayment;
window.copyAccount = copyAccount;
window.confirmTransfer = confirmTransfer;
window.downloadInvoice = downloadInvoice;