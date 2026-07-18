const text = document.querySelector('.announcement-text');

if (text) {

    text.addEventListener('mouseenter', () => {
        text.style.animationPlayState = 'paused';
    });

    text.addEventListener('mouseleave', () => {
        text.style.animationPlayState = 'running';
    });

}
// const menuBtn = document.querySelector(".menu-btn");
// const navLinks = document.querySelector(".nav-links");

// menuBtn.addEventListener("click", () => {
//     navLinks.classList.toggle("active");
// });
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");
const menuIcon = menuBtn.querySelector("i");

menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("active");

    if (navLinks.classList.contains("active")) {
        menuIcon.classList.remove("fa-bars");
        menuIcon.classList.add("fa-times");
    } else {
        menuIcon.classList.remove("fa-times");
        menuIcon.classList.add("fa-bars");
    }
});
// Smooth Scroll

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();

        document.querySelector(
            this.getAttribute("href")
        ).scrollIntoView({
            behavior: "smooth"
        });

        navLinks.classList.remove("active");
    });
});

// Contact Form Demo

const form = document.querySelector("form");

if (form) {

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        alert(
            "Thank you for contacting OTIZKIDDIESWORLD. We'll get back to you shortly."
        );

    });

}
document.addEventListener("DOMContentLoaded", () => {
    // Look for a saved banner announcement posted from your dashboard 
    const liveAnnouncement = localStorage.getItem("otiz_announcement");
    const announcementContainer = document.querySelector(".announcement-text");
    
    if (liveAnnouncement && announcementContainer) {
        announcementContainer.textContent = liveAnnouncement;
    }
});
// --- LIVE USER SIGN-UP CAPTURE ---
// Call this function right inside your signupForm submit event listener on the main page!
function syncUserToAdmin(fullName, email) {
    let users = JSON.parse(localStorage.getItem("otiz_users")) || [];
    
    // Check if user already exists
    if (!users.some(user => user.email === email)) {
        users.push({
            name: fullName,
            email: email,
            status: "Logged In"
        });
        localStorage.setItem("otiz_users", JSON.stringify(users));
    }
}

// --- LIVE ORDER CHECKOUT CAPTURE ---
// Call this function when the user pays/completes checkout from their cart page!
function checkoutCart(customerName, customerPhone, deliveryAddress, cartItems, totalAmount) {
    let orders = JSON.parse(localStorage.getItem("otiz_orders")) || [];
    
    const newOrder = {
        id: "#OKW-" + Math.floor(1000 + Math.random() * 9000), // Generates random Order ID
        name: customerName,
        phone: customerPhone,
        address: deliveryAddress,
        items: cartItems, // Array of items: [{title: 'Casual Wear', price: 12000, img: 'url'}, ...]
        total: totalAmount,
        status: "Pending Delivery"
    };
    
    orders.push(newOrder);
    localStorage.setItem("otiz_orders", JSON.stringify(orders));
    
    // Update live financial revenue tracker
    let currentRevenue = Number(localStorage.getItem("otiz_revenue")) || 0;
    localStorage.setItem("otiz_revenue", currentRevenue + totalAmount);
}

// const signinModal =
// document.getElementById("signinModal");

// const signupModal =
// document.getElementById("signupModal");

// const openSignIn =
// document.getElementById("openSignIn");

// const openSignUp =
// document.getElementById("openSignUp");

// const closeSignIn =
// document.getElementById("closeSignIn");

// const closeSignUp =
// document.getElementById("closeSignUp");

// openSignIn.addEventListener("click", function(e){

//     e.preventDefault();

//     signinModal.style.display = "flex";

// });

// openSignUp.addEventListener("click", function(e){

//     e.preventDefault();

//     signupModal.style.display = "flex";

// });

// closeSignIn.addEventListener("click", function(){

//     signinModal.style.display = "none";

// });

// closeSignUp.addEventListener("click", function(){

//     signupModal.style.display = "none";

// });

// window.addEventListener("click", function(e){

//     if(e.target === signinModal){

//         signinModal.style.display = "none";

//     }

//     if(e.target === signupModal){

//         signupModal.style.display = "none";

//     }

// });
// const popupModal =
// document.getElementById("popupModal");

// const popupFrame =
// document.getElementById("popupFrame");

// const closePopup =
// document.querySelector(".close-popup");

// document.getElementById("openSignIn")
// .addEventListener("click", function(e){

//     e.preventDefault();

//     popupFrame.src = "/signin.html";

//     popupModal.style.display = "flex";

// });

// document.getElementById("openSignUp")
// .addEventListener("click", function(e){

//     e.preventDefault();

//     popupFrame.src = "/signup.html";

//     popupModal.style.display = "flex";

// });

// closePopup.addEventListener("click", function(){

//     popupModal.style.display = "none";

//     popupFrame.src = "";

// });

// window.addEventListener("click", function(e){

//     if(e.target === popupModal){

//         popupModal.style.display = "none";

//         popupFrame.src = "";

//     }

// });