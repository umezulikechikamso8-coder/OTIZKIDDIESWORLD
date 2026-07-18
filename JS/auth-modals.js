  import {
    onAuthStateChanged,
    signInEmail,
    createUserAccount,
    signInGoogle,
    signOutUser,
    resetPassword,
    mergeCart
  } from "./firebase-service.js";

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

  function clearStoredAuthState() {
    window.currentUser = null;
    localStorage.removeItem("otizCurrentUser");
    localStorage.removeItem("mock_current_user");
    localStorage.removeItem("currentUser");

    if (window.OtizFirebase?.auth) {
      window.OtizFirebase.auth.currentUser = null;
    }
  }

  async function updateAuthUI(user) {
    const logoutBtn = document.getElementById("logoutBtn");
    const signinBtn = document.getElementById("signinBtn");
    const signupBtn = document.getElementById("signupBtn");
    const currentUser = document.getElementById("currentUser");
    const userProfile = document.getElementById("userProfile");
    const userInitial = document.getElementById("homeUserInitial") || document.getElementById("collectionUserInitial");
    const adminReturnItem = document.getElementById("adminReturnItem");

    window.currentUser = user;

    if (user) {
      const userLabel = user.displayName || user.name || user.email || user.phoneNumber || "Account";
      const initial = (userLabel || "U").trim().charAt(0).toUpperCase();
      if (userProfile) userProfile.style.display = "flex";
      if (signinBtn) signinBtn.style.display = "none";
      if (signupBtn) signupBtn.style.display = "none";
      if (currentUser) currentUser.textContent = userLabel;
      if (userInitial) userInitial.textContent = initial;
      if (adminReturnItem) {
        adminReturnItem.style.display = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "inline-block" : "none";
      }

      localStorage.setItem("otizCurrentUser", JSON.stringify({
        uid: user.uid || "",
        displayName: user.displayName || user.name || "",
        name: user.displayName || user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || user.phone || "",
        phone: user.phoneNumber || user.phone || "",
        photoURL: user.photoURL || ""
      }));
    } else {
      if (userProfile) userProfile.style.display = "none";
      if (signinBtn) signinBtn.style.display = "inline-block";
      if (signupBtn) signupBtn.style.display = "inline-block";
      if (currentUser) currentUser.textContent = "";
      if (userInitial) userInitial.textContent = "U";
      if (adminReturnItem) adminReturnItem.style.display = "none";
      clearStoredAuthState();
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (error) {
      console.warn("Logout from Firebase failed, clearing local session anyway.", error);
    }

    clearStoredAuthState();
    await updateAuthUI(null);
    showToast("Logged out successfully.");

    setTimeout(() => {
      window.location.reload();
    }, 250);
  }

  window.logoutUser = handleSignOut;
  const ADMIN_EMAIL = "admin@otizkiddiesworld.com";

  async function handleSigninSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("signinEmail").value;
    const password = document.getElementById("signinPassword").value;
    try {
      await signInEmail(email, password);
      const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (!Array.isArray(localCart) || localCart.length === 0) {
        await mergeCart([]);
      }
      showToast("Signed in successfully.");
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "/HTML/Otizadmin.html";
        return;
      }
      document.getElementById("signinModal").setAttribute("aria-hidden", "true");
    } catch (error) {
      console.error('Modal sign-in error', error);
      showToast((error.code ? error.code + ': ' : '') + (error.message || "Failed to sign in."));
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    try {
      await createUserAccount({ name, email, password, phone: "", file: null });
      showToast("Account created successfully.");
      document.getElementById("signupModal").setAttribute("aria-hidden", "true");
    } catch (error) {
      showToast(error.message || "Failed to create account.");
    }
  }

  async function handleGoogleSignup() {
    try {
      await signInGoogle();
      const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (!Array.isArray(localCart) || localCart.length === 0) {
        await mergeCart([]);
      }
      showToast("Signed in with Google.");
      document.getElementById("signinModal").setAttribute("aria-hidden", "true");
    } catch (error) {
      showToast(error.message || "Google sign-in failed.");
    }
  }

  async function handlePasswordReset() {
    const email = prompt("Enter your email to receive password reset instructions:");
    if (!email) return;
    try {
      await resetPassword(email);
      showToast("Password reset sent. Check your inbox.");
    } catch (error) {
      showToast(error.message || "Unable to send reset email.");
    }
  }

  function setupModals() {
    const signinBtn = document.getElementById("signinBtn");
    const signupBtn = document.getElementById("signupBtn");
    const signinModal = document.getElementById("signinModal");
    const signupModal = document.getElementById("signupModal");
    const closeSignin = document.getElementById("closeSignin");
    const closeSignup = document.getElementById("closeSignup");
    const signinForm = document.getElementById("signinForm");
    const signupForm = document.getElementById("signupForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const closeButtons = [closeSignin, closeSignup];
    function openModal(modal) {
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    if (signinBtn) signinBtn.addEventListener("click", () => openModal(signinModal));
    if (signupBtn) signupBtn.addEventListener("click", () => openModal(signupModal));
    if (closeSignin) closeSignin.addEventListener("click", () => closeModal(signinModal));
    if (closeSignup) closeSignup.addEventListener("click", () => closeModal(signupModal));
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleSignOut();
      });
    }

    [signinModal, signupModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    if (signinForm) signinForm.addEventListener("submit", handleSigninSubmit);
    if (signupForm) signupForm.addEventListener("submit", handleSignupSubmit);

    const googleButtons = document.querySelectorAll(".google-btn");
    googleButtons.forEach((button) => button.addEventListener("click", handleGoogleSignup));

    const resetLink = document.getElementById("forgotPasswordLink");
    if (resetLink) {
      resetLink.addEventListener("click", (event) => {
        event.preventDefault();
        handlePasswordReset();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        [signinModal, signupModal].forEach((modal) => {
          if (modal) modal.setAttribute("aria-hidden", "true");
        });
        document.body.style.overflow = "";
      }
    });
  }

  onAuthStateChanged((user) => updateAuthUI(user));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupModals);
  } else {
    setupModals();
  }

