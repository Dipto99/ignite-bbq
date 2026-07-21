const { getStore } = require("@netlify/blobs");
const { MAX_BOOKINGS, getCurrentBatchKey, jsonResponse } = require("./_shared");

// After a customer pays on Stripe's checkout page, they get sent back to
// order.html with a session_id in the URL. The page calls this function
// (a few times, a couple seconds apart) to check whether the webhook has
// finished saving the order yet, so it can show the real order number.
exports.handler = async (event) => {
  const sessionId = event.queryStringParameters?.session_id;

  if (!sessionId) {
    return jsonResponse(400, { error: "Missing session_id." });
  }

  try {
    const store = getStore("ignite-orders");
    const batchKey = getCurrentBatchKey();
    const orders = (await store.get(batchKey, { type: "json" })) || [];
    const order = orders.find((o) => o.stripeSessionId === sessionId);

    if (!order) {
      return jsonResponse(202, { status: "pending" });
    }

    return jsonResponse(200, {
      status: "confirmed",
      orderNumber: order.orderNumber,
      spotsLeft: Math.max(MAX_BOOKINGS - orders.length, 0),
    });
  } catch (err) {
    console.error("get-order-status error:", err);
    return jsonResponse(500, { error: "Could not check order status." });
  }
};
