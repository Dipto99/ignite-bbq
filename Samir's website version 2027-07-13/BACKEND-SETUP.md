# Ignite BBQ — Order Backend Setup (Netlify)

This backend runs entirely on **Netlify** using Netlify Functions (serverless)
and Netlify Blobs (built-in storage) — no separate database to set up.

## What it does
- Saves every order to persistent storage (shared across all visitors, not
  just one browser).
- Tracks spots left for the current week automatically and resets each week.
- Sends a confirmation email to the customer (once you add an email API key).
- Gives you a password-protected `/admin.html` page to see all bookings.

## 1. Deploy to Netlify
1. Push this folder to a GitHub repo (or drag-and-drop deploy in the Netlify
   dashboard).
2. In Netlify: **Add new site → Import an existing project**, connect the repo.
3. Build settings can stay blank — there's nothing to build. Netlify will
   detect `netlify.toml` automatically, which points it at
   `netlify/functions` for your backend code.
4. Deploy. Netlify Blobs works automatically on any Netlify site — nothing
   extra to enable.

## 2. Set your admin password
In Netlify: **Site settings → Environment variables**, add:
- `ADMIN_KEY` — any password you choose, e.g. `smokehouse2026`

This is what you'll type into `/admin.html` to view orders. It's a simple
shared-secret, not a full login system — fine for one or two people checking
orders, but don't share the key publicly.

## 3. (Optional but recommended) Turn on confirmation emails
Emails are sent through [Resend](https://resend.com) (free tier: 100
emails/day, 3,000/month — plenty for this).

1. Create a free Resend account.
2. Verify a sending domain (or use their test domain while you set things up).
3. Grab an API key.
4. In Netlify, add environment variables:
   - `RESEND_API_KEY` — your Resend API key
   - `FROM_EMAIL` — e.g. `Ignite BBQ <orders@yourdomain.com>` (must be a
     verified sender/domain in Resend)

If you skip this step, orders still save and the site still works — customers
just won't get an email yet.

## 4. Try it
- Place a test order on `/order.html` — it should save and show a
  confirmation.
- Visit `/admin.html`, enter your `ADMIN_KEY`, and you should see it listed.
- Check the "Show all weeks" box to see past weeks too.

## How capacity resets
Orders are grouped by the upcoming Saturday's date (your pickup day), so a
new batch — and a fresh 20 spots — starts automatically every week. No
manual reset needed.

## If you're not using Netlify
This backend is Netlify-specific (Functions + Blobs). If you deploy the site
elsewhere (Vercel, GitHub Pages, etc.), you'd need to either:
- Also host just the `netlify/functions` folder on Netlify and point your
  main site's form at that Netlify URL, or
- Rebuild the three functions using that platform's equivalent (e.g. Vercel
  API routes + a database like Vercel KV or Supabase).

Let me know which platform you land on if you'd like help adapting it.
