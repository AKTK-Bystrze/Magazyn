import type { APIRoute } from 'astro';

import * as fs from 'node:fs';
import * as path from 'node:path';

export const prerender = false;

// Log file path in project root
const LOG_FILE = path.join(process.cwd(), 'frontend-browser-debug.log');

export const POST: APIRoute = async ({ request }) => {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.warn("Logger received invalid JSON:", e);
      return new Response("Invalid JSON body", { status: 400 });
    }

    const { level, message, data } = body;
    
    // Normalize level to uppercase for consistency
    const logLevel = (level || 'INFO').toUpperCase();
    
    // Format the log message with a distinct prefix
    const timestamp = new Date().toISOString();
    const prefix = `[BROWSER] ${timestamp} [${logLevel}]`;
    const logMessage = `${prefix} ${message} ${data ? JSON.stringify(data) : ''}\n`;

    // Append to file
    try {
      fs.appendFileSync(LOG_FILE, logMessage);
    } catch (fsError) {
      console.error("Failed to write to log file:", fsError);
    }
    
    // Also log to terminal (optional, but good for confirmation)
    // console.log(logMessage.trim());

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to process client log:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
