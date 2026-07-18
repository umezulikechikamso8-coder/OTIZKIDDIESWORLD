import { createUserAccount } from "./firebase-service.js";

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const showPassword = document.getElementById("showPassword");
const showConfirm = document.getElementById("showConfirm");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");

if (showPassword && password) {
  showPassword.addEventListener("click", () => {
    if (password.type === "password") {
      password.type = "text";
      showPassword.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      password.type = "password";
      showPassword.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
}

if (showConfirm && confirmPassword) {
  showConfirm.addEventListener("click", () => {
    if (confirmPassword.type === "password") {
      confirmPassword.type = "text";
      showConfirm.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      confirmPassword.type = "password";
      showConfirm.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const pass = password.value;
    const confirm = confirmPassword.value;

    if (pass !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    try {
      await createUserAccount({ name, email, password: pass, phone, file: null });
      alert("Account Created Successfully!");
      window.location.href = "/HTML/OTIZKIDDIES.html";
    } catch (error) {
      console.error('Signup error', error);
      alert((error.code ? error.code + ': ' : '') + (error.message || "Unable to create account."));
    }
  });
}

if (password) {
  password.addEventListener("input", () => {
    let value = password.value;
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[^A-Za-z0-9]/.test(value)) strength++;
    switch (strength) {
      case 1:
        strengthBar.style.width = "25%";
        strengthBar.style.background = "red";
        strengthText.innerText = "Weak";
        break;
      case 2:
        strengthBar.style.width = "50%";
        strengthBar.style.background = "orange";
        strengthText.innerText = "Fair";
        break;
      case 3:
        strengthBar.style.width = "75%";
        strengthBar.style.background = "gold";
        strengthText.innerText = "Good";
        break;
      case 4:
        strengthBar.style.width = "100%";
        strengthBar.style.background = "green";
        strengthText.innerText = "Strong";
        break;
      default:
        strengthBar.style.width = "0%";
        strengthText.innerText = "";
    }
  });
}
