import {
  onAuthStateChanged,
  saveCartToFirestore,
  mergeCart,
  getProducts
} from "./firebase-service.js";

const productGrid = document.getElementById("productGrid");
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let allProducts = [];

const hasLoader = typeof window.showLoader === "function" && typeof window.hideLoader === "function";

const staticProducts = [
  {
    name: "Boys Denim Set",
    price: 15000,
    image: "/image/Children Flower Boat Shoes Girl Cute Bow Princess Sneakers Spring and Autumn Kids Casual Running.jpg",
    category: "boys"
  },
  {
    name: "Boys Native Wear",
    price: 18000,
    image: "/image/32228953579102604.jpg",
    category: "boys"
  },
  {
    name: "Girls Party Dress",
    price: 20000,
    image: "/image/32228953579102604.jpg",
    category: "girls"
  },
  {
    name: "Princess Gown",
    price: 22000,
    image: "/image/SHEIN.jpg",
    category: "girls"
  },
  {
    name: "Kids Sneakers",
    price: 12000,
    image: "/image/Disney LED Casual Sneakers.jpg",
    category: "shoes"
  },
  {
    name: "School Shoes",
    price: 14000,
    image: "/image/Chaussures _ Chaussures & talons femme.jpg",
    category: "shoes"
  },
  {
    name: "School Backpack",
    price: 10000,
    image: "/image/New Cute Cartoon Style Children Backpack.jpg",
    category: "bags"
  },
  {
    name: "Travel Bag",
    price: 17000,
    image: "/image/288582288643177444.jpg",
    category: "bags"
  },
  {
    name: "Kids Wristwatch",
    price: 8000,
    image: "/image/VTech Peppa Pig Learning Watch, Purple.jpg",
    category: "accessories"
  },
  {
    name: "Hair Accessories Set",
    price: 5000,
    image: "/image/6Pcs_Set New Solid Ribbon Bowknot Hair Clips For Cute Baby Girls Handmade Bows Hairpin Barrettes Headwear Kids Hair Accessories.jpg",
    category: "accessories"
  }
];

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.right = "20px";
  toast.style.bottom = "20px";
  toast.style.background = "rgba(0,0,0,0.85)";
  toast.style.color = "#fff";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "12px";
  toast.style.zIndex = "9999";
  toast.style.fontSize = "0.95rem";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Products coming from Firestore (via the admin panel) store multiple
// photos in an `images` array. The old static fallback list above still
// uses a single `image` string. This picks whichever is present so both
// formats render correctly.
function getProductImage(product) {
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  if (product.image) {
    return product.image;
  }
  return "https://via.placeholder.com/300x350";
}

function renderProducts(products) {
  allProducts = products;
  if (!productGrid) return;
  productGrid.innerHTML = products
    .map((product) => {
      const imageSrc = getProductImage(product);
      return `
      <div class="product ${product.category || "all"}" data-category="${product.category || "all"}">
        <img src="${imageSrc}" alt="${product.name}">
        <h3 class="product-name">${product.name}</h3>
        <p>₦${Number(product.price).toLocaleString()}</p>
        <button type="button" onclick="addToCart('${product.name.replace(/'/g, "\\'")}', ${Number(product.price)}, '${imageSrc.replace(/'/g, "\\'")}')">
          Add To Cart
        </button>
      </div>
    `;
    })
    .join("");
}

async function loadProducts() {
  try {
    const remoteProducts = await getProducts();
    if (remoteProducts && remoteProducts.length > 0) {
      renderProducts(remoteProducts);
      return;
    }
  } catch (error) {
    console.warn("Firestore products not loaded", error);
  }
  renderProducts(staticProducts);
}

// Holds a loader lock for the full duration of loadProducts() — whether
// it resolves via Firestore data, the static fallback, or an error —
// so the grid never shows briefly empty before content is ready.
async function loadProductsWithLoader() {
  if (hasLoader) window.showLoader();
  try {
    await loadProducts();
  } finally {
    if (hasLoader) window.hideLoader();
  }
}

function addToCart(name, price, image) {
  const existing = cart.find((item) => item.name === name && item.image === image);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name, price, image, quantity: 1 });
  }
  saveCart();
  showToast(`${name} added to cart`);
}

function updateCartCount() {
  const countElement = document.getElementById("cart-count");
  if (!countElement) return;
  const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  countElement.innerText = totalQty;
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  if (typeof saveCartToFirestore === "function") {
    saveCartToFirestore(cart).catch((error) => console.warn("Could not save cart to Firestore", error));
  }
}

function filterProducts(category) {
  const products = document.querySelectorAll(".product");
  products.forEach((product) => {
    if (category === "all") {
      product.style.display = "block";
    } else {
      product.style.display = product.classList.contains(category) ? "block" : "none";
    }
  });
}

function searchProducts() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  const value = input.value.toLowerCase();
  const products = document.querySelectorAll(".product");
  products.forEach((product) => {
    const name = product.querySelector(".product-name").innerText.toLowerCase();
    product.style.display = name.includes(value) ? "block" : "none";
  });
}

window.addToCart = addToCart;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;

loadProductsWithLoader();
updateCartCount();

onAuthStateChanged(async (user) => {
  if (user) {
    if (cart.length === 0) {
      cart = await mergeCart(cart);
    }
    saveCart();
  }
});