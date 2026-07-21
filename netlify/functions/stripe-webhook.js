const { getStore, connectLambda } = require("@netlify/blobs");
const { MAX_BOOKINGS, generateOrderNumber, jsonResponse } = require("./_shared");

// This function is called by STRIPE, not by your website. Stripe hits this
// URL the moment a customer's payment succeeds, and this is the ONLY place
// an order actually gets saved / a spot gets used up. That way nobody's
// spot is reserved unless they actually paid.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  // Required so Netlify Blobs knows which site/deploy to read from when
  // functions use the classic (Lambda-compatible) handler signature.
  connectLambda(event);

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe env vars are missing on the server.");
    return jsonResponse(500, { error: "Stripe isn't configured." });
  }

  const Stripe = require("stripe");
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = event.headers["stripe-signature"];

  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return jsonResponse(400, { error: "Invalid signature." });
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const { name, email, pickupTime, batchKey } = session.metadata || {};

    if (name && email && pickupTime && batchKey) {
      try {
        const store = getStore("ignite-orders");
        const orders = (await store.get(batchKey, { type: "json" })) || [];

        // Don't double-book if Stripe ever resends the same event.
        const alreadyBooked = orders.some((o) => o.stripeSessionId === session.id);

        if (!alreadyBooked) {
          if (orders.length < MAX_BOOKINGS) {
            const order = {
              orderNumber: generateOrderNumber(),
              name,
              email,
              pickupTime,
              pickupDate: batchKey,
              stripeSessionId: session.id,
              amountPaid: (session.amount_total || 0) / 100,
              paid: true,
              createdAt: new Date().toISOString(),
            };

            orders.push(order);
            await store.setJSON(batchKey, orders);

            if (process.env.RESEND_API_KEY) {
              try {
                await sendConfirmationEmail(order);
              } catch (emailErr) {
                console.error("Email send failed:", emailErr);
              }
            }
          } else {
            // Extremely rare: capacity filled between checkout starting and
            // payment completing. Log it clearly so the order number can be
            // refunded manually from the Stripe dashboard.
            console.error(
              `Sold out before payment confirmed for session ${session.id} (${email}). Refund this payment in Stripe.`
            );
          }
        }
      } catch (err) {
        console.error("stripe-webhook error saving order:", err);
        return jsonResponse(500, { error: "Could not save order." });
      }
    }
  }

  return jsonResponse(200, { received: true });
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
          <h1 style="color:#bb3d11;">Order booked & paid 🔥</h1>
          <p>Hi ${escapeHtml(order.name)},</p>
          <p>Your Ignite BBQ order is confirmed for pickup on <strong>Saturday, ${order.pickupDate}</strong> at <strong>${order.pickupTime}</strong>.</p>
          <p>Order number: <strong>${order.orderNumber}</strong></p>
          <p>Amount paid: $${order.amountPaid.toFixed(2)}</p>
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
