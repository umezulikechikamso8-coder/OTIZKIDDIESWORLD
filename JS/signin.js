import { signInEmail, onAuthStateChanged } from "./firebase-service.js";

const ADMIN_EMAIL = "admin@otizkiddiesworld.com";
const urlParams = new URLSearchParams(window.location.search);
const isAdminLogin = urlParams.get("admin") === "1";
const redirectTarget = "/HTML/index.html";
const adminRedirectTarget = "/HTML/Otizadmin.html";

const togglePassword = document.getElementById("togglePassword");
const password = document.getElementById("password");

if (togglePassword && password) {
  togglePassword.addEventListener("click", () => {
    if (password.type === "password") {
      password.type = "text";
      togglePassword.classList.remove("fa-eye");
      togglePassword.classList.add("fa-eye-slash");
    } else {
      password.type = "password";
      togglePassword.classList.remove("fa-eye-slash");
      togglePassword.classList.add("fa-eye");
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (isAdminLogin && loginForm) {
  const notice = document.createElement("div");
  notice.style.marginBottom = "16px";
  notice.style.padding = "12px 16px";
  notice.style.background = "#f8d7da";
  notice.style.color = "#842029";
  notice.style.border = "1px solid #f5c2c7";
  notice.style.borderRadius = "10px";
  notice.textContent = "Admin access is required. Please sign in with the store owner account.";
  loginForm.parentNode.insertBefore(notice, loginForm);
}
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    try {
      await signInEmail(email, pass);
      alert("Login Successful!");

      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        window.location.href = adminRedirectTarget;
      } else {
        window.location.href = redirectTarget;
      }
    } catch (error) {
      console.error('Login error', error);
      alert((error.code ? error.code + ': ' : '') + (error.message || "Unable to sign in."));
    }
  });
}

onAuthStateChanged((user) => {
  if (user) {
    window.currentUser = user;
  }
});