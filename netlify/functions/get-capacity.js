const { getStore, connectLambda } = require("@netlify/blobs");
const { MAX_BOOKINGS, getCurrentBatchKey, jsonResponse } = require("./_shared");

exports.handler = async (event) => {
  // Required so Netlify Blobs knows which site/deploy to read from when
  // functions use the classic (Lambda-compatible) handler signature.
  connectLambda(event);

  try {
    const store = getStore("ignite-orders");
    const batchKey = getCurrentBatchKey();
    const orders = (await store.get(batchKey, { type: "json" })) || [];

    const spotsLeft = Math.max(MAX_BOOKINGS - orders.length, 0);

    return jsonResponse(200, {
      spotsLeft,
      maxBookings: MAX_BOOKINGS,
      pickupDate: batchKey,
    });
  } catch (err) {
    console.error("get-capacity error:", err);
    return jsonResponse(500, { error: "Could not load capacity." });
  }
};
