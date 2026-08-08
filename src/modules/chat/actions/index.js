"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Get current user
const getCurrentUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  return session.user;
};

// Create new chat
export const createChat = async () => {
  const user = await getCurrentUser();

  const chat = await db.chat.create({
    data: {
      title: "New Chat",
      userId: user.id,
    },
  });

  revalidatePath("/");
  return chat;
};

// Delete chat
export const deleteChat = async (chatId) => {
  const user = await getCurrentUser();

  await db.chat.delete({
    where: {
      id: chatId,
      userId: user.id,
    },
  });

  revalidatePath("/");
  // ✅ removed redirect("/") here — client (DeleteChatModal) already
  // handles navigation with router.push("/") + router.refresh()
};

// Get all chats for user
export const getChats = async () => {
  const user = await getCurrentUser();

  const chats = await db.chat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return chats;
};

// Get chat with messages
export const getChat = async (chatId) => {
  const user = await getCurrentUser();

  const chat = await db.chat.findUnique({
    where: {
      id: chatId,
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!chat) redirect("/");

  return chat;
};

// Save message to DB
export const saveMessage = async ({ chatId, content, role }) => {
  const message = await db.message.create({
    data: {
      chatId,
      content,
      role,
    },
  });

  return message;
};

// Update chat title
export const updateChatTitle = async ({ chatId, title }) => {
  const user = await getCurrentUser();

  const chat = await db.chat.update({
    where: {
      id: chatId,
      userId: user.id,
    },
    data: { title },
  });

  revalidatePath("/");
  return chat;
};

// Get messages for a chat
export const getMessages = async (chatId) => {
  const user = await getCurrentUser();

  const chat = await db.chat.findUnique({
    where: {
      id: chatId,
      userId: user.id,
    },
  });

  if (!chat) redirect("/");

  const messages = await db.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  return messages;
};