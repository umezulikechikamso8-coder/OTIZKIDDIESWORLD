document.addEventListener("DOMContentLoaded", () => {

    // =====================================================================
    // FAQ ACCORDION
    // =====================================================================
    document.querySelectorAll(".faq-question").forEach((btn) => {
        btn.addEventListener("click", () => {
            const answer = btn.nextElementSibling;
            const isOpen = btn.classList.contains("open");

            document.querySelectorAll(".faq-question").forEach((b) => {
                b.classList.remove("open");
                if (b.nextElementSibling) b.nextElementSibling.style.maxHeight = null;
            });

            if (!isOpen && answer) {
                btn.classList.add("open");
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // =====================================================================
    // NEWSLETTER FORM — no backend wired yet, just a friendly confirmation.
    // =====================================================================
    const newsletterForm = document.getElementById("newsletterForm");
    if (newsletterForm) {
        newsletterForm.addEventListener("submit", (e) => {
            e.preventDefault();
            newsletterForm.reset();
            showSuccess("Thanks for subscribing! 🎉");
        });
    }

    // =====================================================================
    // CONTACT FORM — saves to Firestore so it shows up in the admin's
    // Messages tab. Loaded dynamically so the page still works (minus
    // this form) if Firebase fails to load for any reason.
    // =====================================================================
    const contactForm = document.getElementById("contactForm");
    if (!contactForm) return;

    (async () => {
        let submitMessage;
        try {
            const firebaseService = await import("/js/firebase-service.js");
            submitMessage = firebaseService.submitMessage;
        } catch (err) {
            console.error("contact.js: Firebase unavailable, contact form disabled.", err);
            showSuccess("Sorry, the contact form is temporarily unavailable. Please reach us on WhatsApp instead.", true);
            return;
        }

        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const subject = document.getElementById("subject").value.trim();
            const message = document.getElementById("message").value.trim();

            if (!name || !email || !phone || !subject || !message) {
                showSuccess("Please fill in every field.", true);
                return;
            }

            const submitBtn = contactForm.querySelector("button[type='submit']");
            const originalBtnText = submitBtn ? submitBtn.textContent : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Sending...";
            }

            try {
                await submitMessage({
                    name,
                    email,
                    phone,
                    text: `[${subject}] ${message}`
                });

                contactForm.reset();
                showSuccess("Message sent! We'll get back to you soon. 🎉");
            } catch (err) {
                console.error("Failed to submit message:", err);
                showSuccess("Something went wrong sending your message. Please try again or reach us on WhatsApp.", true);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    })();

    function showSuccess(msg, isError = false) {
        const el = document.getElementById("success-message");
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? "#dc2626" : "#16a34a";
        el.style.display = "block";
        setTimeout(() => {
            el.style.display = "none";
        }, 4000);
    }
});