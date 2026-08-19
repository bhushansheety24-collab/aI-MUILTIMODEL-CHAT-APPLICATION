"use client";
import { useState, useMemo, Fragment, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserButton from "@/modules/auth/components/user-button";
import { cn } from "@/lib/utils";
import { PlusIcon, SearchIcon, EllipsisIcon, Trash, Settings } from "lucide-react";
import { useChatStore } from "../store/chat-store";
import DeleteChatModal from "./modal/chat-delete-modal";
import { createChat } from "../actions";

const ChatSidebar = ({ user, chats = [] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const activeChatId = pathname?.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  const { setActiveChatId } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleNewChat = () => {
    startTransition(async () => {
      const chat = await createChat();
      setActiveChatId(chat.id);
      router.push(`/chat/${chat.id}`);
      router.refresh();
    });
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.title?.toLowerCase().includes(query) ||
        chat.messages?.some((msg) =>
          msg.content?.toLowerCase().includes(query)
        )
    );
  }, [chats, searchQuery]);

  const groupedChats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = { today: [], yesterday: [], lastWeek: [], older: [] };

    filteredChats.forEach((chat) => {
      const chatDate = new Date(chat.createdAt);
      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= lastWeek) {
        groups.lastWeek.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    return groups;
  }, [filteredChats]);

  const onDelete = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedChatId(chatId);
    setIsModalOpen(true);
  };

  const renderChatList = (chatList) => {
    if (chatList.length === 0) return null;
    return chatList.map((chat) => (
      <Fragment key={chat.id}>
        <Link
          href={`/chat/${chat.id}`}
          onClick={() => setActiveChatId(chat.id)}
          className={cn(
            "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent group",
            chat.id === activeChatId && "bg-accent"
          )}
        >
          <div className="flex flex-row justify-between items-center gap-2">
            <span className="truncate flex-1 text-sm">{chat.title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10"
                  onClick={(e) => e.preventDefault()}
                >
                  <EllipsisIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex flex-row gap-2 cursor-pointer text-red-500 focus:text-red-500"
                  onClick={(e) => onDelete(e, chat.id)}
                >
                  <Trash className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Link>
      </Fragment>
    ));
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar">
      {/* Logo + Title */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Image src="/logo.png" alt="Logo" width={28} height={28} />
        <span className="font-bold text-lg text-foreground">T3.chat</span>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-3">
        <Button
          className="w-full rounded-lg font-semibold"
          onClick={handleNewChat}
          disabled={isPending}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {isPending ? "Creating..." : "New Chat"}
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your threads..."
            className="pl-9 bg-accent border-0 rounded-lg text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2">
        {filteredChats.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {searchQuery ? "No Chats Found" : "No Chats Yet"}
          </div>
        ) : (
          <>
            {groupedChats.today.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Today
                </div>
                {renderChatList(groupedChats.today)}
              </div>
            )}
            {groupedChats.yesterday.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Yesterday
                </div>
                {renderChatList(groupedChats.yesterday)}
              </div>
            )}
            {groupedChats.lastWeek.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Last 7 Days
                </div>
                {renderChatList(groupedChats.lastWeek)}
              </div>
            )}
            {groupedChats.older.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Older
                </div>
                {renderChatList(groupedChats.older)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteChatModal
        chatId={selectedChatId}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />

      {/* User Section */}
      <div className="p-3 flex items-center gap-3 border-t border-border">
        <UserButton user={user} />
        <span className="flex-1 text-sm truncate text-muted-foreground">
          {user.name || user.email}
        </span>
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ChatSidebar;