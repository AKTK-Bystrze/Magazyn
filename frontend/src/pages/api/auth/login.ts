import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const backendUrl = `${BACKEND_URL}/auth/login`;

  try {
    locals.logger?.info("Initiating login");
    const body = await request.text();

    locals.logger?.info("Proxying API request", { method: "POST", url: backendUrl.toString() });
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    const contentType = response.headers.get("content-type");
    const responseBody = await response.text();

    if (!contentType || !contentType.includes("application/json")) {
      locals.logger?.error(`[Proxy] Response body preview: ${responseBody.substring(0, 200)}`);

      return new Response(
        JSON.stringify({
          error: `Backend Error: Received ${response.status} (${contentType || "unknown type"})`,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    locals.logger?.error("Error proxying login request:", { error: error });
    return new Response(
      JSON.stringify({
        error: "Failed to connect to authentication server. Please try again later.",
      }),
      {
        status: 502, // Bad Gateway
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
