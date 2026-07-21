/* IGNITE BBQ — script.js */

const burnSettings = {
  duration: 2450,
  emberAmount: 16,
  smokeAmount: 70,
  burnColor: "215, 67, 15",
  hotColor: "255, 145, 55",
  ashColor: "4, 2, 1"
};

function runBurnTransition(startX, startY, revealAction) {
  let canvas = document.getElementById("burnCanvas");

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "burnCanvas";
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const maxRadius = Math.sqrt(width * width + height * height);

  canvas.classList.add("active");
  canvas.style.opacity = "1";
  revealAction();

  const started = performance.now();

  function organicNoise(angle, time) {
    return (
      Math.sin(angle * 3.5 + time * 0.0022) * 34 +
      Math.sin(angle * 7.8 + time * 0.0035) * 18 +
      Math.sin(angle * 14.2 + time * 0.0045) * 9
    );
  }

  function drawBurnShape(radius, time) {
    ctx.beginPath();
    const points = 210;

    for (let i = 0; i <= points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const noisyRadius = radius + organicNoise(angle, time);
      const x = startX + Math.cos(angle) * noisyRadius;
      const y = startY + Math.sin(angle) * noisyRadius;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
  }

  function animate(now) {
    const elapsed = now - started;
    const progress = Math.min(elapsed / burnSettings.duration, 1);

    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const radius = eased * maxRadius;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = `rgba(${burnSettings.ashColor}, ${Math.max(0, 1 - progress * 1.35)})`;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 70;
    ctx.strokeStyle = `rgba(13, 7, 4, ${0.82 * (1 - progress * 0.45)})`;
    drawBurnShape(radius - 36, elapsed);
    ctx.stroke();

    ctx.lineWidth = 48;
    ctx.strokeStyle = `rgba(${burnSettings.burnColor}, ${0.28 * (1 - progress * 0.35)})`;
    drawBurnShape(radius - 16, elapsed);
    ctx.stroke();

    ctx.lineWidth = 20;
    ctx.strokeStyle = `rgba(${burnSettings.hotColor}, ${0.74 * (1 - progress * 0.45)})`;
    drawBurnShape(radius, elapsed);
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    drawBurnShape(radius - 48, elapsed);
    ctx.fill();
    ctx.restore();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, width, height);
      canvas.classList.remove("active");
      canvas.style.opacity = "0";
    }
  }

  requestAnimationFrame(animate);
}

/* INTRO */

const intro = document.getElementById("intro");

const skipIntro = new URLSearchParams(window.location.search).get("skipIntro") === "true";

if (intro && skipIntro) {
  intro.style.display = "none";
}

if (intro && !skipIntro) {
  intro.innerHTML = `
    <div class="ignite-intro">
      <div class="ignite-ring"></div>
      <div class="ignite-core">
        <div class="ignite-kicker">Ignite BBQ</div>
        <div class="ignite-title">Click<br>To Ignite</div>
        <div class="ignite-sub">Enter the smokehouse</div>
      </div>
    </div>
  `;

  intro.addEventListener("click", (e) => {
    runBurnTransition(e.clientX, e.clientY, () => {
      intro.style.display = "none";
    });
  });
}

/* BURGER MENU */

const burgerBtn = document.getElementById("burgerBtn");
const mobileNav = document.getElementById("mobileNav");
const mobileHours = document.getElementById("mobileHours");
const mobileMenu = document.getElementById("mobileMenu");

if (burgerBtn && mobileNav) {
  burgerBtn.addEventListener("click", () => {
    burgerBtn.classList.toggle("active");
    mobileNav.classList.toggle("active");
  });
}

if (mobileHours) {
  mobileHours.addEventListener("click", () => {
    const hours = document.getElementById("hours");
    if (hours) hours.classList.add("active");

    mobileNav.classList.remove("active");
    burgerBtn.classList.remove("active");
  });
}

if (mobileMenu) {
  mobileMenu.addEventListener("click", () => {
    if (menuPage) menuPage.classList.add("active");

    mobileNav.classList.remove("active");
    burgerBtn.classList.remove("active");
  });
}

/* LOGO PANELS */

const logoButtons = document.querySelectorAll(".logo-click");
const panels = document.querySelectorAll(".info-panel");
const closeButtons = document.querySelectorAll(".panel-close");
const panelBackButtons = document.querySelectorAll(".panel-back");

const menuPage = document.getElementById("menuPage");
const menuBack = document.getElementById("menuBack");
const logoCard = document.querySelector(".logo-card");

logoButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panelId = button.dataset.panel;

    if (logoCard) {
      logoCard.classList.remove("clicked-menu");
      void logoCard.offsetWidth;
      logoCard.classList.add("clicked-menu");
    }

    if (panelId === "menu") {
      panels.forEach((p) => p.classList.remove("active"));
      if (menuPage) menuPage.classList.add("active");
      return;
    }

    panels.forEach((p) => p.classList.remove("active"));

    const selectedPanel = document.getElementById(panelId);
    if (selectedPanel) selectedPanel.classList.add("active");
  });
});

if (menuBack) {
  menuBack.addEventListener("click", () => {
    if (menuPage) menuPage.classList.remove("active");
  });
}

closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    panels.forEach((panel) => panel.classList.remove("active"));
  });
});

panelBackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    panels.forEach((panel) => panel.classList.remove("active"));
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    panels.forEach((panel) => panel.classList.remove("active"));
    if (menuPage) menuPage.classList.remove("active");
    if (mobileNav) mobileNav.classList.remove("active");
    if (burgerBtn) burgerBtn.classList.remove("active");
  }
});

/* ORDER PAGE */

const spotsLeft = document.getElementById("spotsLeft");
const orderForm = document.getElementById("orderForm");
const confirmationBox = document.getElementById("confirmationBox");
const pendingBox = document.getElementById("pendingBox");
const orderNumber = document.getElementById("orderNumber");
const soldOutMessage = document.getElementById("soldOutMessage");
const canceledMessage = document.getElementById("canceledMessage");
const orderErrorMessage = document.getElementById("orderErrorMessage");
const submitOrderBtn = document.getElementById("submitOrderBtn");

function showSoldOut() {
  if (orderForm) orderForm.classList.add("hidden");
  if (soldOutMessage) soldOutMessage.classList.remove("hidden");
}

function showOrderError(message) {
  if (!orderErrorMessage) return;
  orderErrorMessage.textContent = message;
  orderErrorMessage.classList.remove("hidden");
}

function clearOrderError() {
  if (!orderErrorMessage) return;
  orderErrorMessage.textContent = "";
  orderErrorMessage.classList.add("hidden");
}

async function refreshCapacity() {
  if (!spotsLeft) return;

  try {
    const res = await fetch("/.netlify/functions/get-capacity");
    const data = await res.json();

    if (typeof data.spotsLeft === "number") {
      spotsLeft.textContent = data.spotsLeft;
      if (data.spotsLeft <= 0) showSoldOut();
    }
  } catch (err) {
    console.error("Could not load capacity:", err);
    spotsLeft.textContent = "20";
  }
}

if (spotsLeft) {
  refreshCapacity();
}

if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearOrderError();

    const payload = {
      name: document.getElementById("customerName")?.value.trim(),
      email: document.getElementById("customerEmail")?.value.trim(),
      pickupTime: document.getElementById("pickupTime")?.value,
    };

    if (submitOrderBtn) {
      submitOrderBtn.disabled = true;
      submitOrderBtn.textContent = "Redirecting to payment…";
    }

    try {
      const res = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        showSoldOut();
        return;
      }

      if (!res.ok || !data.checkoutUrl) {
        showOrderError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Send the customer to Stripe's secure checkout page. The booking
      // itself only gets saved once they've actually paid.
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("Checkout redirect failed:", err);
      showOrderError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      if (submitOrderBtn) {
        submitOrderBtn.disabled = false;
        submitOrderBtn.textContent = "Pay & Book Order";
      }
    }
  });
}

/* Handle returning from Stripe checkout (success or canceled) */

if (orderForm) {
  const params = new URLSearchParams(window.location.search);
  const paymentSuccess = params.get("success") === "true";
  const paymentCanceled = params.get("canceled") === "true";
  const sessionId = params.get("session_id");

  if (paymentCanceled && canceledMessage) {
    canceledMessage.classList.remove("hidden");
  }

  if (paymentSuccess && sessionId) {
    orderForm.classList.add("hidden");
    if (pendingBox) pendingBox.classList.remove("hidden");
    pollOrderStatus(sessionId);
  }
}

async function pollOrderStatus(sessionId, attempt = 1) {
  const MAX_ATTEMPTS = 15;

  try {
    const res = await fetch(
      `/.netlify/functions/get-order-status?session_id=${encodeURIComponent(sessionId)}`
    );
    const data = await res.json();

    if (res.ok && data.status === "confirmed") {
      if (pendingBox) pendingBox.classList.add("hidden");
      if (confirmationBox) confirmationBox.classList.remove("hidden");
      if (orderNumber) orderNumber.textContent = data.orderNumber;
      if (spotsLeft && typeof data.spotsLeft === "number") {
        spotsLeft.textContent = data.spotsLeft;
      }
      return;
    }
  } catch (err) {
    console.error("Could not check order status:", err);
  }

  if (attempt < MAX_ATTEMPTS) {
    setTimeout(() => pollOrderStatus(sessionId, attempt + 1), 2000);
  } else if (pendingBox) {
    pendingBox.innerHTML =
      "<h2>Still confirming…</h2><p class=\"small-note\">Your payment went through, but this is taking longer than expected. Check your email for confirmation, or refresh this page in a minute.</p>";
  }
}
/* SIDE LABEL BUTTONS */

const cueButtons = document.querySelectorAll(".cue-button");

cueButtons.forEach((button) => {

  button.addEventListener("click", () => {

    const panelId = button.dataset.panel;

    if (panelId === "menu") {

      if (menuPage) {
        menuPage.classList.add("active");
      }

      return;
    }

    panels.forEach((p) => p.classList.remove("active"));

    const selectedPanel = document.getElementById(panelId);

    if (selectedPanel) {
      selectedPanel.classList.add("active");
    }

  });

});