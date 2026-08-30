import { expect, request } from "@playwright/test";
import { E2E_CONFIG } from "../constants/config";

export async function getMagicLinkFromEmail(emailAddress: string): Promise<string> {
  const reqContext = await request.newContext();
  const apiUrl = E2E_CONFIG.API.INBUCKET_URL;

  let latestMessageId = "";

  // Poll for the email
  await expect(async () => {
    // Mailpit search API
    const response = await reqContext.get(
      `${apiUrl}/search?query=${encodeURIComponent("to:" + emailAddress)}`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.messages && data.messages.length).toBeGreaterThan(0);
    latestMessageId = data.messages[0].ID; // Mailpit returns newest first
  }).toPass({
    intervals: [1000, 2000, 5000],
    timeout: 15000,
  });

  // Fetch email body
  const bodyResponse = await reqContext.get(`${apiUrl}/message/${latestMessageId}`);
  const emailData = await bodyResponse.json();

  // Extract Magic Link
  const linkRegex = /(https?:\/\/[^\s"'>]+)/g;

  // Mailpit puts content in Text or HTML
  const bodyText = emailData.Text || emailData.HTML || "";
  const links = bodyText.match(linkRegex);

  if (!links || links.length === 0) {
    throw new Error("No links found in the email body.");
  }

  // Find the token confirmation link robustly
  const magicLink = links.find(
    (link) =>
      link.includes("auth/v1/verify") || link.includes("token=") || link.includes("token_hash=")
  );

  if (!magicLink) {
    throw new Error("No magic link found in the email");
  }

  return magicLink.replace(/[>.)]+$/, "");
}

export async function clearMailbox(emailAddress: string): Promise<void> {
  const reqContext = await request.newContext();
  // Mailpit has a search and delete API
  const query = encodeURIComponent("to:" + emailAddress);
  await reqContext.delete(`${E2E_CONFIG.API.INBUCKET_URL}/search?query=${query}`);
}
