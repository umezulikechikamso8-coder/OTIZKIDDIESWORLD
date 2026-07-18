import {
  onAuthStateChanged,
  saveCartToFirestore,
  mergeCart,
  signOutUser
} from "./firebase-service.js";

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function syncCartFromStorage() {
  try {
    const stored = localStorage.getItem("cart");
    const otizStored = localStorage.getItem("otizCart");
    const parsed = stored ? JSON.parse(stored) : null;
    const otizParsed = otizStored ? JSON.parse(otizStored) : null;
    const nextCart = Array.isArray(parsed) ? parsed : (Array.isArray(otizParsed) ? otizParsed : []);
    cart = Array.isArray(nextCart) ? nextCart : [];
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("otizCart", JSON.stringify(cart));
  } catch (error) {
    console.warn("Unable to sync cart from storage.", error);
    cart = [];
  }
}
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const cartUsername = document.getElementById("cartUsername");
const cartUserInitial = document.getElementById("cartUserInitial");

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.right = "20px";
  toast.style.bottom = "20px";
  toast.style.padding = "12px 16px";
  toast.style.background = "rgba(0,0,0,0.85)";
  toast.style.color = "#fff";
  toast.style.borderRadius = "10px";
  toast.style.zIndex = "9999";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function displayCart() {
  syncCartFromStorage();
  cartItems.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
      </div>
    `;
    cartTotal.innerText = "Total: ₦0";
    return;
  }

  cart.forEach((item, index) => {
    const subtotal = (item.price || 0) * (item.quantity || 1);
    total += subtotal;
    cartItems.innerHTML += `
      <div class="cart-item">
        <div class="product-info">
          <img class="product-image" src="${item.image || "https://via.placeholder.com/120"}" alt="${item.name}">
          <div class="product-details">
            <h3>${item.name}</h3>
            <p>₦${item.price.toLocaleString()}</p>
          </div>
        </div>
        <div class="quantity-controls">
          <button class="qty-btn" onclick="decreaseQty(${index})">-</button>
          <span class="qty">${item.quantity}</span>
          <button class="qty-btn" onclick="increaseQty(${index})">+</button>
        </div>
        <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
      </div>
    `;
  });

  cartTotal.innerText = `Total: ₦${total.toLocaleString()}`;
}

function increaseQty(index) {
  cart[index].quantity = (cart[index].quantity || 1) + 1;
  saveCart();
}

function decreaseQty(index) {
  if ((cart[index].quantity || 1) > 1) {
    cart[index].quantity -= 1;
  } else {
    cart.splice(index, 1);
  }
  saveCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("otizCart", JSON.stringify(cart));
  if (cart.length > 0) {
    localStorage.removeItem("otizCartCleared");
  }
  displayCart();
  saveCartToFirestore(cart).catch(() => {
    console.warn("Unable to sync cart to Firestore.");
  });
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
}

function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    cart = [];
    localStorage.setItem("otizCartCleared", "1");
    saveCart();
  }
}

async function checkout() {
  if (cart.length === 0) {
    showToast("Your cart is empty!");
    return;
  }

  if (!window.currentUser) {
    if (confirm("Please sign in before you checkout. Go to Sign In page?")) {
      window.location.href = "/HTML/signin.html";
    }
    return;
  }

  try {
    saveCart();
    window.location.href = "/HTML/checkout.html";
  } catch (error) {
    showToast(error.message || "Unable to open checkout.");
  }
}

window.increaseQty = increaseQty;
window.decreaseQty = decreaseQty;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.checkout = checkout;

displayCart();
window.addEventListener("storage", () => {
  displayCart();
});

onAuthStateChanged(async (user) => {
  window.currentUser = user;
  const userChip = document.querySelector(".user-chip");

  if (!user) {
    if (cartUsername) cartUsername.textContent = "";
    if (cartUserInitial) cartUserInitial.textContent = "U";
    if (userChip) userChip.style.display = "none";
    localStorage.removeItem("otizCurrentUser");
    return;
  }

  const userLabel = user.displayName || user.name || user.email || user.phoneNumber || "My Username";
  if (cartUsername) cartUsername.textContent = userLabel;
  if (cartUserInitial) {
    const initial = (userLabel || "U").toString().trim().charAt(0).toUpperCase();
    cartUserInitial.textContent = initial;
  }
  if (userChip) userChip.style.display = "flex";

  localStorage.setItem("otizCurrentUser", JSON.stringify({
    uid: user.uid || "",
    displayName: user.displayName || user.name || "",
    name: user.displayName || user.name || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || user.phone || "",
    phone: user.phoneNumber || user.phone || "",
    photoURL: user.photoURL || ""
  }));

  if (cart.length === 0) {
    cart = await mergeCart(cart);
  }
  saveCart();
});
