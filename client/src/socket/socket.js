// socket.js - Socket.io client setup

import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [lastMessage, setLastMessage] = useState(null);
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [currentRoom, setCurrentRoom] = useState('General');
    const [availableRooms] = useState(['General', 'Development', 'Random']);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false); 

    // --- Core Functions ---

    // Connect to socket server
    const connect = (username) => {
        socket.connect();
        if (username) {
            socket.emit('user_join', username);
        }
    };

    // Disconnect from socket server
    const disconnect = () => {
        socket.disconnect();
  };
  
  const sendReaction = (messageId, reaction) => {
    socket.emit('add_reaction', { messageId, reaction });
};
    
  const fetchMessageHistory = async (roomName) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${roomName}`);
      const history = await res.json();
      setMessages(history);
    } catch (err) {
      console.error("Failed to fetch message history:", err);
    }
    setIsLoadingHistory(false);
  };

    // Send a message (Updated for Acks - Task 5)
    const sendMessage = (message) => {
        const tempId = Date.now() + Math.random();
        
        // 1. Create a temporary local message object for immediate display
        const tempMessage = {
            id: tempId,
            sender: users.find(u => u.id === socket.id)?.username || 'You',
            senderId: socket.id,
            content: message,
            room: currentRoom,
            timestamp: new Date().toISOString(),
            isOwnMessage: true,
            status: 'sending', // <-- Initial status
        };
        
        // Add temporary message to the display list immediately
        setMessages((prev) => [...prev, tempMessage]);

        // 2. Emit with acknowledgement callback
        socket.emit('send_message', { message, room: currentRoom }, (response) => {
            // 3. Update status based on server response
            setMessages((prev) => 
                prev.map(msg => 
                    msg.id === tempId 
                        ? { 
                            ...msg, 
                            status: response.status === 'ok' ? 'sent' : 'failed',
                            error: response.status !== 'ok' ? response.message : undefined 
                          } 
                        : msg
                )
            );
            // Optional: clear 'sent' status after a few seconds
            if (response.status === 'ok') {
                setTimeout(() => {
                    setMessages((prev) => 
                        prev.map(msg => 
                            msg.id === tempId ? { ...msg, status: undefined } : msg
                        )
                    );
                }, 5000);
            }
        });
    };
    
    // Send a private message
    const sendPrivateMessage = (to, message) => {
        socket.emit('private_message', { to, message });
    };

    // Set typing status
    const setTyping = (isTyping) => {
        socket.emit('typing', isTyping);
    };

    // Request browser notification permission
    const requestNotificationPermission = () => {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                } else {
                    console.log('Notification permission denied.');
                }
            });
        }
    };

    // Join a room (Now async to wait for history fetch)
    const joinRoom = async (roomName) => {
        if (availableRooms.includes(roomName)) {
            // 1. Fetch history before setting the room and joining
            await fetchMessageHistory(roomName); 
            
            // 2. Emit join event
            socket.emit('join_room', roomName);
            setCurrentRoom(roomName);
        }
    };

    // --- Socket Event Listeners ---
    useEffect(() => {
        const onConnect = () => { setIsConnected(true); };
        const onDisconnect = () => { setIsConnected(false); };

        const onMessageUpdated = (updatedMessage) => {
          setMessages((prev) => 
              prev.map(msg => 
                  msg.id === updatedMessage.id 
                      ? updatedMessage // Replace the old message object with the new one
                      : msg
              )
          );
      };
      

        const onReceiveMessage = (message) => {
            if (message.room === currentRoom) {
                // Logic to prevent duplication of self-sent messages (already handled by ACK update)
                // We only append the message if it's from another user, or if we weren't tracking it.
                if (message.senderId !== socket.id) {
                    setLastMessage(message);
                    setMessages((prev) => [...prev, message]);
                    
                    // Notifications (Task 4)
                    if (document.hidden) {
                        if (Notification.permission === 'granted') {
                            new Notification(`New message in #${message.room} from ${message.sender}`, {
                                body: message.content,
                                icon: '/chat_icon.png' 
                            });
                        }
                        // Sound notification (requires /notification.mp3 in public folder)
                        new Audio('/notification.mp3').play().catch(e => console.error("Could not play sound:", e));
                    }
                }
            }
      };


      
      socket.on('message_updated', onMessageUpdated);

        const onPrivateMessage = (message) => {
            setLastMessage(message);
            setMessages((prev) => [...prev, message]);

            // Notifications (Task 4)
            if (document.hidden && message.senderId !== socket.id) {
                if (Notification.permission === 'granted') {
                    new Notification(`Private Message from ${message.sender}`, {
                        body: message.message,
                        icon: '/chat_icon.png'
                    });
                }
                new Audio('/notification.mp3').play().catch(e => console.error("Could not play sound:", e));
            }
        };
        
        // System and User Events
        const onUserList = (userList) => { setUsers(userList); };
        const createSystemMessage = (message) => ({ id: Date.now() + Math.random(), system: true, message, timestamp: new Date().toISOString() });
        const onUserJoined = (user) => { setMessages((prev) => [...prev, createSystemMessage(`${user.username} joined the chat`)]); };
        const onUserLeft = (user) => { setMessages((prev) => [...prev, createSystemMessage(`${user.username} left the chat`)]); };
        const onRoomJoined = ({ message }) => { setMessages((prev) => [...prev, createSystemMessage(message)]); };
        const onUserJoinedRoom = (data) => { 
            if (data.username !== (users.find(u => u.id === socket.id)?.username || '')) {
                 setMessages((prev) => [...prev, createSystemMessage(data.message)]); 
            }
        };
        const onTypingUsers = (users) => { setTypingUsers(users); };

        // Register event listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('receive_message', onReceiveMessage);
        socket.on('private_message', onPrivateMessage);
        socket.on('user_list', onUserList);
        socket.on('user_joined', onUserJoined);
        socket.on('user_left', onUserLeft);
        socket.on('room_joined', onRoomJoined);
        socket.on('user_joined_room', onUserJoinedRoom);
        socket.on('typing_users', onTypingUsers);
        socket.on('message_updated', onMessageUpdated);

        // Clean up event listeners
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('receive_message', onReceiveMessage);
            socket.off('private_message', onPrivateMessage);
            socket.off('user_list', onUserList);
            socket.off('user_joined', onUserJoined);
            socket.off('user_left', onUserLeft);
            socket.off('room_joined', onRoomJoined);
            socket.off('user_joined_room', onUserJoinedRoom);
            socket.off('typing_users', onTypingUsers);
            socket.off('message_updated', onMessageUpdated);
        };
    }, [currentRoom, users, socket.id]); // Dependency array updated

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
