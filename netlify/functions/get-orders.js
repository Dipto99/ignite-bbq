const { getStore } = require("@netlify/blobs");
const { MAX_BOOKINGS, getCurrentBatchKey, jsonResponse } = require("./_shared");

exports.handler = async (event) => {
  const providedKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;

  if (!process.env.ADMIN_KEY) {
    return jsonResponse(500, {
      error: "Admin access isn't configured yet. Set the ADMIN_KEY environment variable in Netlify.",
    });
  }

  if (!providedKey || providedKey !== process.env.ADMIN_KEY) {
    return jsonResponse(401, { error: "Incorrect admin key." });
  }

  try {
    const store = getStore("ignite-orders");
    const showAll = event.queryStringParameters?.all === "true";

    if (!showAll) {
      const batchKey = getCurrentBatchKey();
      const orders = (await store.get(batchKey, { type: "json" })) || [];
      return jsonResponse(200, {
        batches: [{ pickupDate: batchKey, orders }],
        maxBookings: MAX_BOOKINGS,
      });
    }

    // List every week's batch of orders that's ever been stored.
    const { blobs } = await store.list();
    const batches = await Promise.all(
      blobs.map(async (b) => ({
        pickupDate: b.key,
        orders: (await store.get(b.key, { type: "json" })) || [],
      }))
    );
    batches.sort((a, b) => (a.pickupDate < b.pickupDate ? 1 : -1));

    return jsonResponse(200, { batches, maxBookings: MAX_BOOKINGS });
  } catch (err) {
    console.error("get-orders error:", err);
    return jsonResponse(500, { error: "Could not load orders.", detail: err.message });
  }
};
