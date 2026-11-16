# Smartsupp Live Chat Setup

The chat widget is installed globally and remains disabled until a Smartsupp key is configured.

1. In the Smartsupp dashboard, open **Settings → Chat box → Chat code** and copy your unique account key.
2. Set `NEXT_PUBLIC_SMARTSUPP_KEY` to that key in the local environment and in the production deployment environment.
3. Restart the development server or rebuild and redeploy so the public environment variable is included.

The key is a public widget identifier, not an API secret. Do not paste a full Smartsupp script into this variable.

Smartsupp may set its own cookies and process visitor messages and details shared in chat. Review the provider’s current privacy and cookie information and update Meridian’s notices with the exact storage names and durations used by the configured widget before production use.
