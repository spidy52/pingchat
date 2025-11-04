import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../stores/useChatStore";
import { useAuthStore } from "../stores/useAuthStore";
import { Send, X, Loader2, Check, CheckCheck } from "lucide-react";

const ChatContainer = () => {
  const { selectedChat, messages, sendMessage, isLoadingMessages, isTyping, startTyping, stopTyping } = useChatStore();
  const { authUser } = useAuthStore();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const otherUser = selectedChat?.participants.find((p) => p._id !== authUser?.id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!otherUser || !selectedChat) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    startTyping(selectedChat._id, otherUser._id);

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedChat._id, otherUser._id);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !otherUser || !selectedChat) return;

    await sendMessage(messageText);
    setMessageText("");

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping(selectedChat._id, otherUser._id);
  };

  const getMessageStatus = (message: any) => {
    if (message.senderId._id === authUser?.id || message.senderId === authUser?.id) {
      if (message.readAt) {
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      }
      if (message.deliveredAt) {
        return <CheckCheck className="w-4 h-4 text-base-content/70" />;
      }
      return <Check className="w-4 h-4 text-base-content/70" />;
    }
    return null;
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-base-content/70">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-base-300 p-4 bg-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={otherUser?.avatar || "/avatar.png"}
                alt={otherUser?.displayName}
                className="size-10 object-cover rounded-full"
              />
              {selectedChat.isOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
              )}
            </div>
            <div>
              <h3 className="font-medium">{otherUser?.displayName}</h3>
              <p className="text-sm text-base-content/70">
                {selectedChat.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <button
            onClick={() => useChatStore.getState().clearSelectedChat()}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-base-content/70">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage =
                (typeof message.senderId === 'object' && message.senderId._id === authUser?.id) ||
                message.senderId === authUser?.id;

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content"
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {getMessageStatus(message)}
                    </div>
                  </div>
                </div>
              );
            })}
            {otherUser && isTyping[otherUser._id] && (
              <div className="flex justify-start">
                <div className="bg-base-200 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-base-content/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-base-content/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-base-content/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-base-300 p-4 bg-base-200">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="input input-bordered flex-1"
          />
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="btn btn-primary"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatContainer;