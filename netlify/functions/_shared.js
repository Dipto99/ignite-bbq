// Shared helpers used by the order functions.

const MAX_BOOKINGS = 20;

/**
 * Orders open Sunday midnight through Wednesday midnight, for pickup the
 * following Saturday. We key each week's batch of orders by that Saturday's
 * date, so capacity automatically resets every week with no manual work.
 */
function getCurrentBatchKey(now = new Date()) {
  const date = new Date(now);
  const day = date.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = new Date(date);
  saturday.setUTCDate(date.getUTCDate() + daysUntilSaturday);
  saturday.setUTCHours(0, 0, 0, 0);
  return saturday.toISOString().slice(0, 10); // e.g. "2026-07-18"
}

function generateOrderNumber() {
  return "IGN-" + Math.floor(100000 + Math.random() * 900000);
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = {
  MAX_BOOKINGS,
  getCurrentBatchKey,
  generateOrderNumber,
  jsonResponse,
};
