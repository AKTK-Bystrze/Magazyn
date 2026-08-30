# E2E Email Testing Report: Local Automation Tools

When testing email workflows like Magic Links or Password Resets in local E2E environments, injecting authentication cookies bypasses the actual user interface and email flow. To verify the identical flow of a real user, we must capture emails sent by Supabase during local development and parse them in the tests.

## Evaluation of Lightweight Local SMTP Tools

Here is a comparison of tools that can intercept and expose emails via an API, making them suitable for Playwright E2E tests:

### 1. Mailpit (Current Supabase Default)
- **Overview**: A modern, lightweight email testing tool written in Go. It acts as an SMTP server and provides both a web UI and a REST API.
- **Pros**: 
  - **Native Supabase Support**: As of recent updates, the Supabase CLI has deprecated Inbucket in favor of Mailpit for local testing. It runs automatically with `npx supabase start` on port 54324.
  - **REST API**: Excellent search capabilities (`/api/v1/search?query=to:email@example.com`) and individual message retrieval (`/api/v1/message/{ID}`).
  - **Lightweight**: Very fast, low memory footprint.
- **Cons**: None for local development.

### 2. Inbucket (Legacy Supabase Default)
- **Overview**: An open-source email testing tool that accepts messages and stores them in memory.
- **Pros**: Good REST API.
- **Cons**: Has been officially deprecated by Supabase CLI. API can be slightly more verbose to work with compared to Mailpit.

### 3. MailSlurp
- **Overview**: A hosted cloud service for end-to-end email testing.
- **Pros**: Provides real email addresses, great SDK for Playwright/Cypress, handles complex routing.
- **Cons**: Requires an internet connection and a paid subscription for high-volume E2E suites. Overkill for local dockerized testing.

### 4. Ethereal Email
- **Overview**: A fake SMTP service created by Nodemailer.
- **Pros**: Easy to use for debugging Node applications.
- **Cons**: Hosted service, not meant for intense automated test polling locally.

## Conclusion & Recommendation

**Mailpit** is the absolute best choice for this task. 
Since Supabase already uses Mailpit natively for its local development environment (running on port `54324`), we can simply hit the Mailpit REST API from our Playwright helpers to search for the magic link and execute the true UI-based login flow. This entirely eliminates the need to mock cookies or use third-party paid services.
