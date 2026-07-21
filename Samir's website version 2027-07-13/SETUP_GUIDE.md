# Ignite BBQ — Setup Guide

This walks you through everything, start to finish, assuming zero coding experience.
Follow it top to bottom, in order.

---

## What changed in this update

- **Payments**: customers now pay $25 by card (via Stripe) at checkout. A spot is only
  booked once the payment actually goes through — nobody can hold a spot without paying.
- **Weekly reset**: this already worked before and still works — bookings are grouped by
  the upcoming Saturday's date, so a new week automatically starts with 20 fresh spots. You
  don't need to do anything to "reset" it.
- **Admin page**: works the same as before (a private page only you can get into with a
  password), now shows a "Paid" column instead of "Dessert" (dessert isn't on the menu
  anymore, so that's been removed — it was actually broken before, since the order form
  never had a dessert option but the server required one).
- **Menu**: added real descriptions for each dish, and centered the Main Plate (Beef Back
  Ribs) as the featured item above the two sides.

---

## Part 1 — Get the website online (Netlify)

You'll host the whole site — pages and the "backend" logic — on **Netlify**, for free.

### 1. Put the code on GitHub
1. Go to [github.com](https://github.com) and create a free account if you don't have one.
2. Click the **+** in the top right → **New repository**. Name it `ignite-bbq`. Keep it
   Public or Private, doesn't matter. Click **Create repository**.
3. On the new repo's page, click **uploading an existing file**.
4. Drag in *every file and folder* from the `ignite-bbq` folder I've given you (including
   the `netlify` folder — make sure it keeps its folder structure).
5. Scroll down, click **Commit changes**.

### 2. Connect it to Netlify
1. Go to [netlify.com](https://www.netlify.com) and sign up (you can sign up with your
   GitHub account — easiest option).
2. Click **Add new site → Import an existing project**.
3. Choose **GitHub**, then pick the `ignite-bbq` repository.
4. Netlify should auto-detect the settings from `netlify.toml`. Leave everything as-is and
   click **Deploy**.
5. After a minute or two, Netlify gives you a live web address, like
   `https://ignite-bbq-1234.netlify.app`. That's your website! You can later change this to
   a custom domain (like `ignitebbq.com`) from **Site settings → Domain management**.

From now on, whenever you upload new files to GitHub, Netlify automatically re-publishes
your site within a minute or two.

---

## Part 2 — Turn on payments (Stripe)

### 1. Create a Stripe account
1. Go to [stripe.com](https://stripe.com) and sign up (you'll need your business/bank info
   to eventually receive payouts, but you can test everything before finishing that part).

### 2. Get your API key
1. In the Stripe Dashboard, make sure you're in **Test mode** first (toggle top right) to
   try everything safely before going live.
2. Go to **Developers → API keys**.
3. Copy the **Secret key** (starts with `sk_test_...`). Keep this private — never share it
   or put it in your website's code.

### 3. Add it to Netlify
1. In Netlify, go to your site → **Site configuration → Environment variables**.
2. Click **Add a variable**, and add:
   - Key: `STRIPE_SECRET_KEY`
   - Value: *(paste the secret key you copied)*
3. Click **Create variable**.

### 4. Set up the webhook (this is what actually books the order after payment)
1. In Stripe, go to **Developers → Webhooks → Add endpoint**.
2. For the endpoint URL, enter:
   `https://YOUR-SITE-NAME.netlify.app/.netlify/functions/stripe-webhook`
   (use your real Netlify address).
3. Under "Select events to listen to," choose **checkout.session.completed**.
4. Click **Add endpoint**.
5. Click into the new webhook, and copy the **Signing secret** (starts with `whsec_...`).
6. Back in Netlify's environment variables, add another one:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: *(paste the signing secret)*

### 5. Redeploy
Environment variables only take effect on the next deploy. In Netlify, go to
**Deploys → Trigger deploy → Deploy site** once after adding the variables.

### 6. Test it
1. Visit your live site's `order.html` page and fill out a test order.
2. On Stripe's checkout page, use their official test card: `4242 4242 4242 4242`, any
   future expiry date, any 3-digit CVC, any ZIP.
3. You should land back on the order page with a real order number, and the order should
   show up on your admin page (see Part 3).

### 7. Go live
Once you're happy with testing, in Stripe flip the toggle from **Test mode** to **Live
mode**, get the **live** secret key (`sk_live_...`) and repeat steps 3–5 with the live key
and a live webhook. Real customers will now be charged for real.

---

## Part 3 — Set up the admin page

The admin page lets you see everyone who's booked (and paid) that week, and every past
week if you want.

1. Make up a password — something only you know, e.g. `Ignite2026Smoke!`.
2. In Netlify, add one more environment variable:
   - Key: `ADMIN_KEY`
   - Value: *(your password)*
3. Redeploy the site once (same as Part 2, step 5) so it takes effect.
4. To view orders: go to `https://YOUR-SITE-NAME.netlify.app/admin.html`, type in your
   password, and click **View Orders**.
5. Bookmark that page — that's your permanent "who's ordered this week" dashboard.
6. Check **Show all weeks** to see every week that's ever had orders, not just the current
   one.

---

## Part 4 (optional) — Confirmation emails

If you'd like customers to automatically get a confirmation email after paying:

1. Sign up at [resend.com](https://resend.com) (free tier is generous for this size of
   business).
2. Verify a sending domain or use their default for testing.
3. Get an API key from their dashboard.
4. In Netlify, add:
   - `RESEND_API_KEY` → your Resend API key
   - `FROM_EMAIL` → e.g. `Ignite BBQ <orders@yourdomain.com>` (optional; there's a default)
5. Redeploy. If you skip this whole section entirely, everything else still works fine —
   customers just won't get an email, only the on-screen confirmation.

---

## Quick reference — all environment variables

| Variable | Required? | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes, for payments | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Yes, for payments | Stripe → Developers → Webhooks |
| `ADMIN_KEY` | Yes, for admin page | You make this up yourself |
| `RESEND_API_KEY` | Optional | resend.com dashboard |
| `FROM_EMAIL` | Optional | Your own choice |

All of these are set in **Netlify → Site configuration → Environment variables**, then
require one redeploy to take effect.

---

## Notes

- **Capacity resets automatically** every week — no action needed from you.
- **A spot is only used up once someone actually pays.** If they abandon the Stripe
  checkout page, nothing is booked and the spot stays open.
- If you ever change the price ($25.00), or the max weekly bookings (20), those live in
  `netlify/functions/create-checkout-session.js` (price) and
  `netlify/functions/_shared.js` (`MAX_BOOKINGS`).
