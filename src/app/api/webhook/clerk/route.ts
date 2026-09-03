// src/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;
  if (!SIGNING_SECRET) {
    console.error("Missing SIGNING_SECRET in .env.local");
    return new Response("Missing SIGNING_SECRET", { status: 500 });
  }

  const wh = new Webhook(SIGNING_SECRET);

  // Clerk sends these headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  const eventData = evt.data as any;
  const id = eventData.id;

  if (!id) {
    return new Response("Missing user ID", { status: 400 });
  }

  if (evt.type === "user.created") {
    try {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        await prisma.user.create({ data: { id } });
        console.log("✅ User created:", id);
      }
    } catch (err) {
      console.error("Failed to create user:", err);
      return new Response("Error creating user", { status: 500 });
    }
  }

  if (evt.type === "user.updated") {
    // optional: log or do something if needed
    console.log("🔁 User updated:", id);
  }

  return new Response("Webhook received", { status: 200 });
}
