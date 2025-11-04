import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import axiosInstance from "../lib/axios.config";
import { toast } from "react-hot-toast";

type TUser = {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  email: string;
};

type TAttachment = {
  type: string;
  url: string;
};

type TMessage = {
  _id: string;
  chatId: string;
  senderId: TUser | string;
  content: string;
  attachments?: TAttachment[];
  deliveredAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TChat = {
  _id: string;
  type: "direct" | "group";
  participants: TUser[];
  lastMessage?: TMessage;
  unreadCount: number;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TChatStore = {
  socket: Socket | null;
  chats: TChat[];
  selectedChat: TChat | null;
  messages: TMessage[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isTyping: Record<string, boolean>;
  
  // Socket methods
  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
  
  // Chat methods
  fetchChats: () => Promise<void>;
  selectChat: (chat: TChat) => Promise<void>;
  createDirectChat: (otherUserId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  
  // Message methods
  fetchMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (content: string, attachments?: TAttachment[]) => Promise<void>;
  markMessagesAsRead: (chatId: string, otherUserId: string) => void;
  
  // Typing indicators
  startTyping: (chatId: string, receiverId: string) => void;
  stopTyping: (chatId: string, receiverId: string) => void;
  
  // Cleanup
  clearSelectedChat: () => void;
};

export const useChatStore = create<TChatStore>()((set, get) => ({
  socket: null,
  chats: [],
  selectedChat: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  isTyping: {},

  connectSocket: (userId: string) => {
    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[SOCKET] Connected:", socket.id);
      
      // Notify server that user is online
      socket.emit("user:online", userId, (response: { status: string; error?: string }) => {
        if (response.status === "ok") {
          console.log("[SOCKET] User marked as online");
        } else {
          console.error("[SOCKET] Failed to mark user online:", response.error);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("[SOCKET] Disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("[SOCKET] Connection error:", error);
      toast.error("Connection error. Retrying...");
    });

    // Listen for incoming messages
    socket.on("message:received", (message: TMessage) => {
      console.log("[SOCKET] Message received:", message);
      
      const { selectedChat, messages } = get();
      
      // Add message to current chat if it's selected
      if (selectedChat && message.chatId === selectedChat._id) {
        set({ messages: [...messages, message] });
        
        // Auto-mark as delivered
        socket.emit(
          "message:delivered",
          { 
            messageId: message._id, 
            senderId: typeof message.senderId === 'string' ? message.senderId : message.senderId._id 
          },
          (response: { status: string }) => {
            if (response.status === "ok") {
              console.log("[SOCKET] Message marked as delivered");
            }
          }
        );
      } else {
        // Update unread count for other chats
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat._id === message.chatId
              ? { ...chat, unreadCount: chat.unreadCount + 1, lastMessage: message }
              : chat
          ),
        }));
      }
      
      // Refresh chats to update last message
      get().fetchChats();
    });

    // Listen for message delivery confirmations
    socket.on("message:delivered", ({ messageId }: { messageId: string }) => {
      console.log("[SOCKET] Message delivered:", messageId);
      
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, deliveredAt: new Date() } : msg
        ),
      }));
    });

    // Listen for read receipts
    socket.on("chat:messagesRead", ({ chatId }: { chatId: string }) => {
      console.log("[SOCKET] Messages read in chat:", chatId);
      
      const { selectedChat } = get();
      if (selectedChat && selectedChat._id === chatId) {
        set((state) => ({
          messages: state.messages.map((msg) => ({
            ...msg,
            readAt: msg.readAt || new Date(),
          })),
        }));
      }
    });

    // Listen for typing indicators
    socket.on(
      "typing:status",
      ({ chatId, userId, isTyping }: { chatId: string; userId: string; isTyping: boolean }) => {
        console.log(`[SOCKET] User ${userId} ${isTyping ? "started" : "stopped"} typing in ${chatId}`);
        
        set((state) => ({
          isTyping: {
            ...state.isTyping,
            [userId]: isTyping,
          },
        }));
      }
    );

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      console.log("[SOCKET] Manually disconnected");
      set({ socket: null });
    }
  },

  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const response = await axiosInstance.get("/chats");
      set({ chats: response.data.chats });
    } catch (error) {
      console.error("[CHAT] Failed to fetch chats:", error);
      toast.error("Failed to load chats");
    } finally {
      set({ isLoadingChats: false });
    }
  },

  selectChat: async (chat: TChat) => {
    set({ selectedChat: chat, messages: [] });
    await get().fetchMessages(chat._id);
    
    // Mark messages as read
    const otherUser = chat.participants.find((p) => p._id !== chat.participants[0]._id);
    if (otherUser) {
      get().markMessagesAsRead(chat._id, otherUser._id);
    }
  },

  createDirectChat: async (otherUserId: string) => {
    try {
      const response = await axiosInstance.post("/chats/direct", { otherUserId });
      const newChat = response.data.chat;
      
      set((state) => {
        const existingChat = state.chats.find((c) => c._id === newChat._id);
        return {
          chats: existingChat ? state.chats : [...state.chats, newChat],
          selectedChat: newChat,
        };
      });
      
      await get().fetchMessages(newChat._id);
    } catch (error) {
      console.error("[CHAT] Failed to create chat:", error);
      toast.error("Failed to create chat");
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      await axiosInstance.delete(`/chats/${chatId}`);
      
      set((state) => ({
        chats: state.chats.filter((c) => c._id !== chatId),
        selectedChat: state.selectedChat?._id === chatId ? null : state.selectedChat,
        messages: state.selectedChat?._id === chatId ? [] : state.messages,
      }));
      
      toast.success("Chat deleted");
    } catch (error) {
      console.error("[CHAT] Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  },

  fetchMessages: async (chatId: string, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const response = await axiosInstance.get(`/chats/${chatId}/messages`, {
        params: { page, limit: 50 },
      });
      
      set({ messages: response.data.messages });
    } catch (error) {
      console.error("[CHAT] Failed to fetch messages:", error);
      toast.error("Failed to load messages");
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content: string, attachments?: TAttachment[]) => {
    const { socket, selectedChat } = get();
    
    if (!socket || !selectedChat) {
      toast.error("Cannot send message");
      return;
    }

    const otherUser = selectedChat.participants.find(
      (p) => p._id !== selectedChat.participants[0]._id
    );
    
    if (!otherUser) {
      toast.error("Cannot find recipient");
      return;
    }

    const messageData = {
      chatId: selectedChat._id,
      senderId: selectedChat.participants[0]._id,
      receiverId: otherUser._id,
      content,
      attachments: attachments || [],
    };

    // Optimistically add message to UI
    const tempMessage: TMessage = {
      _id: `temp-${Date.now()}`,
      ...messageData,
      senderId: selectedChat.participants[0],
      deliveredAt: null,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, tempMessage],
    }));

    socket.emit("message:send", messageData, (response: { status: string; error?: string }) => {
      if (response.status === "ok") {
        console.log("[SOCKET] Message sent successfully");
      } else {
        console.error("[SOCKET] Failed to send message:", response.error);
        toast.error("Failed to send message");
        
        // Remove temp message on failure
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== tempMessage._id),
        }));
      }
    });
  },

  markMessagesAsRead: (chatId: string, otherUserId: string) => {
    const { socket } = get();
    
    if (!socket) return;

    socket.emit(
      "chat:markRead",
      {
        chatId,
        userId: get().selectedChat?.participants[0]._id,
        otherUserId,
      },
      (response: { status: string }) => {
        if (response.status === "ok") {
          console.log("[SOCKET] Messages marked as read");
          
          // Update local state
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
            ),
          }));
        }
      }
    );
  },

  startTyping: (chatId: string, receiverId: string) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit("typing:start", {
      chatId,
      userId: get().selectedChat?.participants[0]._id,
      receiverId,
    });
  },

  stopTyping: (chatId: string, receiverId: string) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit("typing:stop", {
      chatId,
      userId: get().selectedChat?.participants[0]._id,
      receiverId,
    });
  },

  clearSelectedChat: () => {
    set({ selectedChat: null, messages: [] });
  },
}));