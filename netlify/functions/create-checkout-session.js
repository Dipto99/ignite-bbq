const { getStore } = require("@netlify/blobs");
const {
  MAX_BOOKINGS,
  getCurrentBatchKey,
  jsonResponse,
} = require("./_shared");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PICKUP_TIMES = [
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
];

// $25.00 plate, in cents (this is what Stripe charges the customer).
const PLATE_PRICE_CENTS = 2500;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonResponse(500, {
      error:
        "Payments aren't set up yet. Add STRIPE_SECRET_KEY in your Netlify site settings.",
    });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid request body." });
  }

  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const pickupTime = String(data.pickupTime || "").trim();

  if (!name || !email || !pickupTime) {
    return jsonResponse(400, { error: "Please fill in every field." });
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse(400, { error: "That email address doesn't look right." });
  }
  if (!PICKUP_TIMES.includes(pickupTime)) {
    return jsonResponse(400, { error: "Please choose a valid pickup time." });
  }

  try {
    // Loaded lazily so the function still works even if the "stripe"
    // package hasn't finished installing in a preview environment.
    const Stripe = require("stripe");
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const store = getStore("ignite-orders");
    const batchKey = getCurrentBatchKey();
    const orders = (await store.get(batchKey, { type: "json" })) || [];

    if (orders.length >= MAX_BOOKINGS) {
      return jsonResponse(409, { error: "Sold out for this week.", spotsLeft: 0 });
    }

    // Figure out the site's own URL so Stripe knows where to send the
    // customer back to after they pay (or cancel).
    const siteUrl = process.env.URL || `https://${event.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PLATE_PRICE_CENTS,
            product_data: {
              name: "Ignite BBQ Plate",
              description: "Beef back ribs, herb roasted potatoes & seasonal salad",
            },
          },
        },
      ],
      // We don't create the booking until Stripe confirms the payment
      // (see stripe-webhook.js). This metadata is how the webhook knows
      // who to book once the money has actually come through.
      metadata: { name, email, pickupTime, batchKey },
      success_url: `${siteUrl}/order.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order.html?canceled=true`,
    });

    return jsonResponse(200, { checkoutUrl: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return jsonResponse(500, { error: "Something went wrong starting checkout." });
  }
};
