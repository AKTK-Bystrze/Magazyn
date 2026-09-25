const fs = require('fs');
const path = require('path');

const apiDir = 'E:/bystrze/Magazyn/frontend/src/pages/api';

function modifyFile(filePath, callback) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = callback(content);
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Modified: ' + filePath);
        }
    } else {
        console.log('File not found: ' + filePath);
    }
}

// 1. Remove GET export from maintenance-logs
modifyFile(path.join(apiDir, 'equipment/[id]/maintenance-logs.ts'), (content) => {
    const regex = /\/\*\*[\s\S]*?\* GET \/api\/equipment\/{id}\/maintenance-logs[\s\S]*?\*\/\r?\nexport const GET: APIRoute = async \(\{ params, locals \}\) => \{[\s\S]*?^};\r?\n*/m;
    return content.replace(regex, '');
});

// 2. Delete equipment/[id]/reservations.ts
const resPath = path.join(apiDir, 'equipment/[id]/reservations.ts');
if (fs.existsSync(resPath)) {
    fs.unlinkSync(resPath);
    console.log('Deleted: ' + resPath);
}

// 3. Create new files
const filesToCreate = {
    'credits/requests.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching credit requests");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(\`\${BACKEND_URL}/credits/requests\`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Credits API] GET Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Creating credit request");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(\`\${BACKEND_URL}/credits/requests\`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Credits API] POST Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'credits/requests/[id].ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const PUT: APIRoute = async ({ locals, request, params }) => {
  locals.logger?.info(\`Updating credit request \${params.id}\`);
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(\`\${BACKEND_URL}/credits/requests/\${params.id}\`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Credits API] PUT Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'credits/requests/[id]/status.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const PATCH: APIRoute = async ({ locals, request, params }) => {
  locals.logger?.info(\`Updating credit request status \${params.id}\`);
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(\`\${BACKEND_URL}/credits/requests/\${params.id}/status\`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Credits API] PATCH Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'users/credits.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching user credits");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(\`\${BACKEND_URL}/users/credits\`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Users API] GET Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'analytics/equipment-stats.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching equipment stats");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(\`\${BACKEND_URL}/analytics/equipment-stats\`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Analytics API] GET Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'analytics/user-stats.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching user stats");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(\`\${BACKEND_URL}/analytics/user-stats\`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Analytics API] GET Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'calendar/availability.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching calendar availability");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(\`\${BACKEND_URL}/calendar/availability\`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Calendar API] GET Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'reservations/dashboard.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching reservations dashboard");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(\`\${BACKEND_URL}/reservations/dashboard\`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Reservations API] GET Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`,
    'reservations/bulk.ts': `import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const PATCH: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Bulk updating reservations");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    
    locals.logger?.info(\`[Reservations API] PATCH Request:\`, { data: "/reservations/bulk" });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    });

    const response = await fetch(\`\${BACKEND_URL}/reservations/bulk\`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    locals.logger?.info(\`[Reservations API] PATCH Response status:\`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(\`[Reservations API] PATCH Proxy error:\`, { error: error });
    return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
`
};

for (const [relPath, content] of Object.entries(filesToCreate)) {
    const fullPath = path.join(apiDir, relPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Created: ' + fullPath);
}

// 4. Remove bulk PATCH from reservations/index.ts
modifyFile(path.join(apiDir, 'reservations/index.ts'), (content) => {
    const regex = /\/\*\*\r?\n \* PATCH \/api\/reservations[\s\S]*?export const PATCH: APIRoute = async[\s\S]*?^};\r?\n*/m;
    return content.replace(regex, '');
});

// 5. Replace generic messages with errors and codes in ALL files in api dir
function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            modifyFile(fullPath, (content) => {
                let newContent = content.replace(/\{\s*message:\s*"Unauthorized"\s*\}/g, '{ error: "Unauthorized", code: "UNAUTHORIZED" }');
                newContent = newContent.replace(/\{\s*message:\s*'Unauthorized'\s*\}/g, '{ error: "Unauthorized", code: "UNAUTHORIZED" }');
                newContent = newContent.replace(/\{\s*message:\s*"Internal Server Error"\s*\}/g, '{ error: "Internal Server Error", code: "INTERNAL_ERROR" }');
                newContent = newContent.replace(/\{\s*message:\s*'Internal Server Error'\s*\}/g, '{ error: "Internal Server Error", code: "INTERNAL_ERROR" }');
                return newContent;
            });
        }
    }
}
processDirectory(apiDir);
console.log("Done");
