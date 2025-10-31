// socket.js - Socket.io client setup

import { io } from "socket.io-client";
import { useEffect, useState } from "react";

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: {
    token: localStorage.getItem("token"), // ✅ Send JWT to server
  },
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]); // This will be replaced by online users
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState("General");
  const [availableRooms] = useState(["General", "Development", "Random"]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- Core Functions ---

  // Connect to socket server
  const connect = (username) => {
    socket.auth = { token: localStorage.getItem("token") }; // ✅ Ensure token set before connect
    socket.connect();

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      if (username) {
        socket.emit("user_join", username); // ✅ Let server know who joined
      }
    });
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  const sendReaction = (messageId, reaction) => {
    socket.emit("add_reaction", { messageId, reaction });
  };

  const fetchMessageHistory = async (roomName) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/messages/${roomName}`);
      const history = await res.json();
      setMessages(history);
    } catch (err) {
      console.error("Failed to fetch message history:", err);
    }
    setIsLoadingHistory(false);
  };

  // Send a message
  const sendMessage = (message) => {
    const tempId = Date.now() + Math.random();

    const tempMessage = {
      id: tempId,
      sender: users.find((u) => u.id === socket.id)?.username || "You",
      senderId: socket.id,
      content: message,
      room: currentRoom,
      timestamp: new Date().toISOString(),
      isOwnMessage: true,
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMessage]);

    socket.emit("send_message", { message, room: currentRoom }, (response) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                status: response.status === "ok" ? "sent" : "failed",
                error:
                  response.status !== "ok" ? response.message : undefined,
              }
            : msg
        )
      );

      if (response.status === "ok") {
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...msg, status: undefined } : msg
            )
          );
        }, 5000);
      }
    });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit("private_message", { to, message });
  };

  const setTyping = (isTyping) => {
    socket.emit("typing", isTyping);
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        console.log(
          permission === "granted"
            ? "Notification permission granted."
            : "Notification permission denied."
        );
      });
    }
  };

  const joinRoom = async (roomName) => {
    if (availableRooms.includes(roomName)) {
      await fetchMessageHistory(roomName);
      socket.emit("join_room", roomName);
      setCurrentRoom(roomName);
    }
  };

  // --- Socket Event Listeners ---
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onMessageUpdated = (updatedMessage) => {
    setMessages((prev) =>
        prev.map((msg) => {
        // Match either temporary id or MongoDB _id
        if (msg._id === updatedMessage._id || msg.id === updatedMessage._id) {
            return { ...updatedMessage, isOwnMessage: msg.isOwnMessage };
        }
        return msg;
        })
    );
    };

     

    const normalizeMessage = (msg) => ({
  ...msg,
  _id: msg._id || msg.id, // fallback
});

        const onReceiveMessage = (message) => {
        const normalized = normalizeMessage(message);
        if (normalized.room === currentRoom && normalized.senderId !== socket.id) {
            setLastMessage(normalized);
            setMessages((prev) => [...prev, normalized]);
        

        if (document.hidden && Notification.permission === "granted") {
          new Notification(`New message in #${message.room}`, {
            body: `${message.sender}: ${message.content}`,
            icon: "/chat_icon.png",
          });
        }
      }
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    // ✅ Handle online users (NEW)
    const onOnlineUsers = (onlineList) => {
      console.log("🟢 Online users:", onlineList);
      setUsers(onlineList);
    };

    // System and user events
    const onUserList = (userList) => setUsers(userList);
    const createSystemMessage = (msg) => ({
      id: Date.now() + Math.random(),
      system: true,
      message: msg,
      timestamp: new Date().toISOString(),
    });
    const onUserJoined = (user) =>
      setMessages((p) => [...p, createSystemMessage(`${user.username} joined`)]);
    const onUserLeft = (user) =>
      setMessages((p) => [...p, createSystemMessage(`${user.username} left`)]);
    const onTypingUsers = (users) => setTypingUsers(users);

    // --- Register Events ---
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_message", onReceiveMessage);
    socket.on("private_message", onPrivateMessage);
    socket.on("user_list", onUserList);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("typing_users", onTypingUsers);
    socket.on("message_updated", onMessageUpdated);
    socket.on("online_users", onOnlineUsers); // ✅ new event

    // Cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_message", onReceiveMessage);
      socket.off("private_message", onPrivateMessage);
      socket.off("user_list", onUserList);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("typing_users", onTypingUsers);
      socket.off("message_updated", onMessageUpdated);
      socket.off("online_users", onOnlineUsers);
    };
  }, [currentRoom, users]);

  return {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    currentRoom,
    availableRooms,
    joinRoom,
    requestNotificationPermission,
    isLoadingHistory,
    sendReaction,
  };
};

export default socket;
