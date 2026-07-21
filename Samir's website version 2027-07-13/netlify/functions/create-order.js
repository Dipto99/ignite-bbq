const { getStore } = require("@netlify/blobs");
const {
  MAX_BOOKINGS,
  getCurrentBatchKey,
  generateOrderNumber,
  jsonResponse,
} = require("./_shared");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DESSERT_OPTIONS = [
  "Chocolate Cookie",
  "Raspberry Cheesecake Cookie",
  "Oatmeal Raisin Cookie",
];

const PICKUP_TIMES = [
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid request body." });
  }

  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const dessert = String(data.dessert || "").trim();
  const pickupTime = String(data.pickupTime || "").trim();

  if (!name || !email || !dessert || !pickupTime) {
    return jsonResponse(400, { error: "Please fill in every field." });
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse(400, { error: "That email address doesn't look right." });
  }
  if (!DESSERT_OPTIONS.includes(dessert)) {
    return jsonResponse(400, { error: "Please choose a valid dessert option." });
  }
  if (!PICKUP_TIMES.includes(pickupTime)) {
    return jsonResponse(400, { error: "Please choose a valid pickup time." });
  }

  try {
    const store = getStore("ignite-orders");
    const batchKey = getCurrentBatchKey();
    const orders = (await store.get(batchKey, { type: "json" })) || [];

    if (orders.length >= MAX_BOOKINGS) {
      return jsonResponse(409, { error: "Sold out for this week.", spotsLeft: 0 });
    }

    const order = {
      orderNumber: generateOrderNumber(),
      name,
      email,
      dessert,
      pickupTime,
      pickupDate: batchKey,
      createdAt: new Date().toISOString(),
    };

    orders.push(order);
    await store.setJSON(batchKey, orders);

    // Fire off a confirmation email if Resend is configured. If it's not
    // set up yet, the order still saves fine -- email just gets skipped.
    if (process.env.RESEND_API_KEY) {
      try {
        await sendConfirmationEmail(order);
      } catch (emailErr) {
        // Don't fail the whole order just because the email didn't send.
        console.error("Email send failed:", emailErr);
      }
    }

    return jsonResponse(200, {
      orderNumber: order.orderNumber,
      spotsLeft: Math.max(MAX_BOOKINGS - orders.length, 0),
    });
  } catch (err) {
    console.error("create-order error:", err);
    return jsonResponse(500, { error: "Something went wrong saving your order." });
  }
};

async function sendConfirmationEmail(order) {
  const fromAddress = process.env.FROM_EMAIL || "Ignite BBQ <orders@ignitebbq.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: order.email,
      subject: `Your Ignite BBQ order — ${order.orderNumber}`,
      html: `
        <div style="font-family: Georgia, serif; color: #2a1a10; padding: 24px;">
          <h1 style="color:#bb3d11;">Order booked 🔥</h1>
          <p>Hi ${escapeHtml(order.name)},</p>
          <p>Your Ignite BBQ order is confirmed for pickup on <strong>Saturday, ${order.pickupDate}</strong> at <strong>${order.pickupTime}</strong>.</p>
          <p>Order number: <strong>${order.orderNumber}</strong></p>
          <p>Dessert: ${escapeHtml(order.dessert)}</p>
          <p>Total: $25.00, paid at pickup.</p>
          <p>See you at the smoker!</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error: ${res.status} ${text}`);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
