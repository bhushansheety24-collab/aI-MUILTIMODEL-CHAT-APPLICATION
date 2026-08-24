import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getGoogleToken() {
  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: "google" },
      headers: await headers(),
    });
    return accessToken;
  } catch (err) {
    console.error("🔑 getGoogleToken error:", err);
    throw err;
  }
}

export async function searchGmail(query, maxResults = 5) {
  const accessToken = await getGoogleToken();

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail search failed: ${listRes.status} - ${errText}`);
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];

  const details = await Promise.all(
    messages.map(async (m) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const headersList = data.payload?.headers || [];
      const get = (name) =>
        headersList.find((h) => h.name === name)?.value || "";

      // Find attachments in the message parts
      const attachments = [];
      const findAttachments = (part) => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId,
            mimeType: part.mimeType,
          });
        }
        if (part.parts) part.parts.forEach(findAttachments);
      };
      if (data.payload) findAttachments(data.payload);

      return {
        messageId: m.id,
        subject: get("Subject"),
        from: get("From"),
        date: get("Date"),
        snippet: data.snippet,
        attachments,
      };
    })
  );

  return details;
}

export async function getGmailAttachment(messageId, attachmentId) {
  const accessToken = await getGoogleToken();

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch attachment: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  // Gmail returns base64url-encoded data — convert to standard base64
  const base64 = data.data.replace(/-/g, "+").replace(/_/g, "/");
  return base64;
}

export async function searchDrive(query, maxResults = 5) {
  const accessToken = await getGoogleToken();

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name contains '${query.replace(
      /'/g,
      ""
    )}'&pageSize=${maxResults}&fields=files(id,name,mimeType,webViewLink,modifiedTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
  const data = await res.json();

  return (data.files || []).map((f) => ({
    name: f.name,
    type: f.mimeType,
    link: f.webViewLink,
    modified: f.modifiedTime,
  }));
}
export async function listCalendarEvents(maxResults = 10, timeMin, timeMax) {
  const accessToken = await getGoogleToken();

  const effectiveTimeMin = timeMin || new Date().toISOString();
  const params = new URLSearchParams({
    timeMin: effectiveTimeMin,
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (timeMax) params.set("timeMax", timeMax);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Calendar list failed: ${res.status}`);
  const data = await res.json();

  return (data.items || []).map((e) => ({
    title: e.summary,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    location: e.location,
    link: e.htmlLink,
  }));
}
  

export async function createCalendarEvent({ title, description, startDateTime, endDateTime }) {
  const accessToken = await getGoogleToken();

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create event: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return { title: data.summary, link: data.htmlLink };
}