# Resend email notifications

Meridian sends transactional notification emails through Resend's server-side email API. The API key is only read on the server and must never use a `NEXT_PUBLIC_` name.

## Configure Resend

1. Create a Resend API key with sending access and verify the sending domain in Resend.
2. Add these environment variables to `.env.local` for local development and to the Vercel project for each deployed environment:

   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=Meridian <notifications@your-verified-domain.com>
   APP_URL=https://your-site.example
   ADMIN_NOTIFICATION_EMAIL=admin@your-domain.example
   ```

   `ADMIN_NOTIFICATION_EMAIL` is optional. When set, it receives a generic alert when a new registration awaits review. Use a sender address from a domain verified by Resend. The Resend test sender is suitable only for its permitted testing flow.

3. Restart the local app after changing `.env.local`. In Vercel, redeploy after saving the variables.

## Notifications sent

- Registration received, with an optional admin review alert
- Registration approval, rejection, suspension, reactivation, or account closure
- Account creation and joint-account invitation updates
- Transfer, cancellation, QR-demo payment, and mobile-money demo activity
- Admin messages and account activity posted by an administrator
- Card issuance and administrator card-setting changes

Emails avoid including full account numbers, card numbers, passwords, PINs, or verification codes. In-app notifications remain available even when Resend is not configured or email delivery fails. External payment routes in this project remain simulated and are not sent to their named providers.

## Troubleshooting

- If no email is sent, confirm both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in the server environment.
- Verify that the sender domain is active in Resend and that the API key has permission to send email.
- Check the Resend dashboard's email logs and the server logs for a delivery failure status.
- Email delivery is best-effort: a Resend outage does not roll back sign-in, registration, or a banking action. A request may wait up to eight seconds for an email attempt to time out.
