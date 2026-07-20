// Dynamically load the Firebase Web SDK from CDN.
const CDN_BASE = 'https://www.gstatic.com/firebasejs/11.0.0';
let initializeApp, getAuth, vendorOnAuthStateChanged, signOut, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
  RecaptchaVerifier, signInWithPhoneNumber, updateProfile, setPersistence, browserLocalPersistence;
let getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, onSnapshot;
let getStorage, ref, uploadBytes, getDownloadURL;

async function loadFirebaseModules(){
  const appMod = await import(`${CDN_BASE}/firebase-app.js`);
  const authMod = await import(`${CDN_BASE}/firebase-auth.js`);
  const fsMod = await import(`${CDN_BASE}/firebase-firestore.js`);
  const stMod = await import(`${CDN_BASE}/firebase-storage.js`);

  initializeApp = appMod.initializeApp;
  ({ getAuth, onAuthStateChanged: vendorOnAuthStateChanged, signOut, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
    RecaptchaVerifier, signInWithPhoneNumber, updateProfile, setPersistence, browserLocalPersistence } = authMod);

  ({ getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, onSnapshot } = fsMod);

  ({ getStorage, ref, uploadBytes, getDownloadURL } = stMod);

  console.info('Firebase SDK loaded from CDN');
  window.OtizFirebase = window.OtizFirebase || {};
  window.OtizFirebase.firebaseLoadedFrom = 'cdn';
}

try {
  await loadFirebaseModules();
} catch (err) {
  console.error("Firebase SDK failed to load from CDN. Auth/DB features will be unavailable.", err);
  window.OtizFirebase = window.OtizFirebase || {};
  window.OtizFirebase.firebaseLoadError = err;
}

const firebaseConfig = {
  apiKey: "AIzaSyDpJEJp9gVC4cBmbD2O_hjR5vTlOF0Fjk0",
  authDomain: "otizkiddiesworld.firebaseapp.com",
  projectId: "otizkiddiesworld",
  storageBucket: "otizkiddiesworld.firebasestorage.app",
  messagingSenderId: "237263599845",
  appId: "1:237263599845:web:ef1dadc1d96e6acc63bc0c",
  measurementId: "G-PD711YWWZF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Ensure auth persistence (when available from the real SDK)
if (typeof setPersistence === 'function' && typeof browserLocalPersistence !== 'undefined'){
  try{
    await setPersistence(auth, browserLocalPersistence);
  }catch(err){
    console.warn('Failed to set auth persistence:', err);
  }
}
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

function initRecaptcha(containerId = "recaptcha-container") {
  if (window.recaptchaVerifier) return window.recaptchaVerifier;
  const container = document.getElementById(containerId);
  if (!container) return null;

  window.recaptchaVerifier = new RecaptchaVerifier(
    container,
    {
      size: "invisible",
      callback: (response) => {
        console.log("reCAPTCHA solved", response);
      }
    },
    auth
  );

  return window.recaptchaVerifier;
}

function onAuthStateChanged(callback) {
  return vendorOnAuthStateChanged(auth, callback);
}

async function uploadProfileImage(userId, file) {
  if (!file) return null;
  const fileRef = ref(storage, `profileImages/${userId}/${Date.now()}-${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
}

async function uploadProductImage(file, productId) {
  if (!file) return null;
  const fileRef = ref(storage, `productImages/${productId || Date.now()}-${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
}

async function saveUserProfile(user, profileData = {}) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      email: user.email || profileData.email || "",
      name: profileData.name || user.displayName || "",
      phone: profileData.phone || user.phoneNumber || "",
      avatar: profileData.avatar || user.photoURL || "",
      createdAt: serverTimestamp(),
      role: profileData.role || "customer"
    },
    { merge: true }
  );
}

async function createUserAccount({ name, email, password, phone, file }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  let avatarUrl = "";
  if (file) {
    avatarUrl = await uploadProfileImage(user.uid, file);
  }

  await updateProfile(user, {
    displayName: name,
    photoURL: avatarUrl || null,
    phoneNumber: phone || null
  });

  await saveUserProfile(user, {
    name,
    email,
    phone,
    avatar: avatarUrl
  });

  return user;
}

async function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function signInGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  await saveUserProfile(user, {
    name: user.displayName,
    email: user.email,
    phone: user.phoneNumber,
    avatar: user.photoURL
  });
  return user;
}

async function signInByPhone(phone) {
  const verifier = initRecaptcha();
  if (!verifier) {
    throw new Error("reCAPTCHA container is missing.");
  }
  const confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

async function verifyPhoneCode(code) {
  if (!window.confirmationResult) {
    throw new Error("No phone confirmation available.");
  }
  const result = await window.confirmationResult.confirm(code);
  const user = result.user;
  await saveUserProfile(user, {
    name: user.displayName || "",
    email: user.email || "",
    phone: user.phoneNumber,
    avatar: user.photoURL || ""
  });
  return user;
}

async function signOutUser() {
  try {
    return await signOut(auth);
  } catch (error) {
    console.warn("Firebase sign-out failed, proceeding with local cleanup.", error);
    return null;
  }
}

async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

async function saveCartToFirestore(cart) {
  if (!auth.currentUser) return;
  const cartRef = doc(db, "carts", auth.currentUser.uid);
  await setDoc(
    cartRef,
    {
      userId: auth.currentUser.uid,
      items: cart,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function loadCartFromFirestore(userId) {
  if (!userId) return [];
  const cartRef = doc(db, "carts", userId);
  const cartSnapshot = await getDoc(cartRef);
  return cartSnapshot.exists() ? cartSnapshot.data().items || [] : [];
}

function mergeCartItems(localCart, remoteCart) {
  const merged = Array.isArray(localCart) ? [...localCart] : [];
  const remoteItems = Array.isArray(remoteCart) ? remoteCart : [];

  if (!merged.length) {
    return remoteItems;
  }

  remoteItems.forEach((remoteItem) => {
    const existing = merged.find(
      (item) => item.name === remoteItem.name && item.image === remoteItem.image
    );
    if (existing) {
      existing.quantity = Math.max(existing.quantity || 1, remoteItem.quantity || 1);
    } else {
      merged.push(remoteItem);
    }
  });

  return merged;
}

async function mergeCart(localCart) {
  if (!auth.currentUser) return localCart;

  const clearedCartFlag = typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("otizCartCleared") === "1"
    : false;

  if (clearedCartFlag && (!Array.isArray(localCart) || localCart.length === 0)) {
    await saveCartToFirestore([]);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("otizCartCleared");
    }
    return [];
  }

  const remoteCart = await loadCartFromFirestore(auth.currentUser.uid);
  const mergedCart = mergeCartItems(localCart, remoteCart);
  await saveCartToFirestore(mergedCart);
  return mergedCart;
}

async function placeOrder(cart, customer) {
  if (!auth.currentUser) {
    throw new Error("You must be signed in to place an order.");
  }
  const order = {
    userId: auth.currentUser.uid,
    customer,
    items: cart,
    subtotal: cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    total: cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    status: "Pending",
    createdAt: serverTimestamp()
  };
  const ordersCollection = collection(db, "orders");
  const orderDoc = await addDoc(ordersCollection, order);
  return orderDoc.id;
}

async function getProducts() {
  const productsCollection = collection(db, "products");
  const snapshot = await getDocs(productsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function addProduct(product) {
  const productsCollection = collection(db, "products");
  const docRef = await addDoc(productsCollection, {
    ...product,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

async function updateProduct(productId, product) {
  const productRef = doc(db, "products", productId);
  await updateDoc(productRef, product);
}

async function deleteProduct(productId) {
  const productRef = doc(db, "products", productId);
  await deleteDoc(productRef);
}

async function getOrders() {
  const ordersCollection = collection(db, "orders");
  const snapshot = await getDocs(ordersCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Live order feed for the admin panel. The first snapshot fires an "added"
// change for every existing order — that burst is swallowed so callback
// only fires for orders placed after the listener attaches.
function listenForNewOrders(callback) {
  const ordersCollection = collection(db, "orders");
  let isFirstSnapshot = true;
  return onSnapshot(
    ordersCollection,
    (snapshot) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          callback({ id: change.doc.id, ...change.doc.data() });
        }
      });
    },
    (err) => console.error("Live order listener failed:", err)
  );
}

async function getUsers() {
  const usersCollection = collection(db, "users");
  const snapshot = await getDocs(usersCollection);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function updateOrderStatus(orderId, status) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { status });
}

// --- SITE-WIDE ANNOUNCEMENT BANNER ---
// Stored as a single document at settings/announcement so every visitor's
// browser reads the same text, and the admin panel writes to that one place.
async function getAnnouncement() {
  const annRef = doc(db, "settings", "announcement");
  const snap = await getDoc(annRef);
  return snap.exists() ? snap.data().text || "" : "";
}

async function setAnnouncement(text) {
  const annRef = doc(db, "settings", "announcement");
  await setDoc(annRef, { text, updatedAt: serverTimestamp() }, { merge: true });
}

// --- CONTACT ENQUIRIES / MESSAGES ---
// Anyone (signed in or not) can submit a message from the contact form.
// Only the admin reads them back — see the "messages" collection rule.
async function submitMessage({ name, email, phone, text }) {
  const messagesCollection = collection(db, "messages");
  const docRef = await addDoc(messagesCollection, {
    name: name || "",
    email: email || "",
    phone: phone || "",
    text: text || "",
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

async function getMessages() {
  const messagesCollection = collection(db, "messages");
  const snapshot = await getDocs(messagesCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

window.OtizFirebase = {
  app,
  auth,
  db,
  storage,
  onAuthStateChanged: onAuthStateChanged,
  createUserAccount,
  signInEmail,
  signInGoogle,
  signInByPhone,
  verifyPhoneCode,
  signOutUser,
  resetPassword,
  saveCartToFirestore,
  loadCartFromFirestore,
  mergeCart,
  placeOrder,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getOrders,
  listenForNewOrders,
  getUsers,
  updateOrderStatus,
  getAnnouncement,
  setAnnouncement,
  submitMessage,
  getMessages,
  initRecaptcha
};

export {
  app,
  auth,
  db,
  storage,
  onAuthStateChanged,
  createUserAccount,
  signInEmail,
  signInGoogle,
  signInByPhone,
  verifyPhoneCode,
  signOutUser,
  resetPassword,
  saveCartToFirestore,
  loadCartFromFirestore,
  mergeCart,
  placeOrder,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getOrders,
  listenForNewOrders,
  getUsers,
  updateOrderStatus,
  getAnnouncement,
  setAnnouncement,
  submitMessage,
  getMessages,
  initRecaptcha
};