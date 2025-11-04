import { useEffect } from "react";
import { useChatStore } from "../stores/useChatStore";
import { useAuthStore } from "../stores/useAuthStore";
import { Users } from "lucide-react";
import SidebarSkeleton from "./skeleton/SidebarSkeleton";

const Sidebar = () => {
  const { chats, fetchChats, selectChat, selectedChat, isLoadingChats } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  if (isLoadingChats) {
    return <SidebarSkeleton />;
  }

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <span className="font-medium hidden lg:block">Chats</span>
        </div>
        <div className="mt-3 hidden lg:block text-xs text-base-content/70">
          {chats.length} conversations
        </div>
      </div>

      {/* Chat List */}
      <div className="overflow-y-auto w-full py-3">
        {chats.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            <p className="hidden lg:block">No conversations yet</p>
            <p className="lg:hidden">No chats</p>
          </div>
        ) : (
          chats.map((chat) => {
            const otherUser = chat.participants.find((p) => p._id !== authUser?.id);
            const isSelected = selectedChat?._id === chat._id;

            return (
              <button
                key={chat._id}
                onClick={() => selectChat(chat)}
                className={`
                  w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors
                  ${isSelected ? "bg-base-300" : ""}
                `}
              >
                {/* Avatar */}
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={otherUser?.avatar || "/avatar.png"}
                    alt={otherUser?.displayName}
                    className="size-12 object-cover rounded-full"
                  />
                  {chat.isOnline && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                  )}
                </div>

                {/* User Info - Hidden on mobile */}
                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="font-medium truncate">{otherUser?.displayName}</p>
                    {chat.lastMessage && (
                      <span className="text-xs text-base-content/70">
                        {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-base-content/70 truncate">
                      {chat.lastMessage?.content || "No messages yet"}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 bg-primary text-primary-content text-xs font-bold px-2 py-1 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread indicator for mobile */}
                {chat.unreadCount > 0 && (
                  <span className="lg:hidden absolute top-1 right-1 bg-primary size-2 rounded-full" />
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;