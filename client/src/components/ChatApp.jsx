import React, { useState, useEffect, useRef } from 'react';
// CORRECTED PATHS: Added file extensions for strict build environments
import { useSocket } from '../socket/socket.js'; 
import PrivateMessageSender from './PrivateMessageSender.jsx';
import RoomSelector from './RoomSelector.jsx';
import MessageReaction from './MessageReaction.jsx'; 

function ChatApp() {
    const { 
        isConnected, messages, users, typingUsers, 
        sendMessage, setTyping, disconnect, socket,
        currentRoom, availableRooms, joinRoom, requestNotificationPermission,
        isLoadingHistory 
    } = useSocket();

    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    const currentUser = users.find(u => u.id === socket.id)?.username || 'You';

    // 1. Initial Room Join Logic & Connection Cleanup
    useEffect(() => {
        if (isConnected && currentRoom) {
            joinRoom(currentRoom); // Join the default/current room on mount
        }
    }, [isConnected, currentRoom]); // joinRoom is now async, so we avoid listing it in dependencies

    // 2. Notification Permission Request
    useEffect(() => {
        // Request permission shortly after connecting
        const timer = setTimeout(() => {
            requestNotificationPermission();
        }, 3000); 

        return () => clearTimeout(timer);
    }, [requestNotificationPermission]); 

    // Scroll to the latest message whenever a new message arrives
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim()) {
            sendMessage(inputMessage.trim());
            setInputMessage('');
            setTyping(false);
        }
    };

    const handleTyping = (e) => {
        const value = e.target.value;
        setInputMessage(value);

        // Simple debounce: only set typing status if input length changes
        if (value.length > 0) {
            setTyping(true);
        } else {
            setTyping(false);
        }
    };

    const renderMessage = (msg) => {
        const isSystem = msg.system;
        const isPrivate = msg.isPrivate;
        const isOwnMessage = msg.senderId === socket.id;
        const messageStatus = msg.status; // 'sending', 'sent', 'failed', or undefined

        const msgBaseClass = 'mb-2 p-3 rounded-xl max-w-sm break-words clear-both';
        let msgClasses = msgBaseClass;
        let senderColor = 'text-gray-700';
        let alignment = 'float-left';

        // Message Status Indicator (Tailwind styling)
        let statusText = null;
        if (messageStatus === 'sending') {
            statusText = <span className="ml-2 text-xs text-yellow-600 font-semibold">...</span>;
        } else if (messageStatus === 'failed') {
            statusText = <span className="ml-2 text-xs text-red-600 font-semibold">! Failed</span>;
        } else if (messageStatus === 'sent') {
            statusText = <span className="ml-2 text-xs text-green-600 font-semibold">✓ Sent</span>;
        }

        if (isPrivate) {
            msgClasses += ' bg-purple-100 mr-auto shadow-md'; 
            senderColor = 'text-purple-600';
        } 
        else if (isSystem) {
            msgClasses = 'text-center text-sm italic text-gray-500 my-4 w-full';
            return (
                <div key={msg.id} className={msgClasses}>
                    {msg.message || msg.content}
                </div>
            );
        } else if (isOwnMessage) {
            msgClasses += ' bg-green-200 ml-auto';
            senderColor = 'text-green-800';
            alignment = 'text-right';
        } else {
            msgClasses += ' bg-white mr-auto shadow-sm';
            senderColor = 'text-blue-600';
        }

        const content = msg.message || msg.content;
        const senderDisplay = isOwnMessage ? 'You' : msg.senderName || msg.sender || msg.username || msg.email;

        
        return (
            <div key={msg.id} className={`${msgClasses} ${alignment}`}>
                <span className={`block font-bold text-sm ${senderColor}`}>
                    {senderDisplay}
                    {isPrivate && <span className="text-xs font-normal text-red-500 ml-1">(Private)</span>}
                </span>
                <span className="block text-base">{content}</span>
                <span className="block text-xs text-gray-400 mt-1 flex justify-end items-center">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                    {statusText}
                </span>

                {/* --- NEW: Message Reaction Component --- */}
                {!isSystem && (
                    <MessageReaction message={msg} senderId={msg.senderId} />
                )}
                {/* -------------------------------------- */}
            </div>
        );
    
    };


    // Filter messages for the current room or private messages sent/received by this user
    const filteredMessages = messages.filter(msg => 
        msg.room === currentRoom || msg.isPrivate
    );

    return (
        <div className="flex flex-col w-full max-w-4xl h-[90vh] bg-gray-100 rounded-xl shadow-2xl overflow-hidden">
            <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200 shadow-md">
                <h3 className="text-xl font-semibold text-gray-800">
                    Channel: <span className="text-blue-600"># {currentRoom}</span>
                </h3>
                <div className="flex items-center space-x-4">
                    <p className="text-sm font-medium">
                        Status: 
                        <span className={`font-bold ml-1 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                            {isConnected ? 'Online' : 'Offline'}
                        </span>
                    </p>
                    <button 
                        onClick={() => disconnect()} 
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-150"
                    >
                        Leave
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
                    {/* ROOM SELECTOR */}
                    <RoomSelector 
                        currentRoom={currentRoom} 
                        availableRooms={availableRooms} 
                        joinRoom={joinRoom} 
                    />

                    {/* USER LIST */}
                    <div className="p-4">
                        <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-300">
                            Online Users ({users.length})
                        </h4>
                        <ul className="list-none p-0">
                            {users.map(user => (
                                <li 
                                    key={user.id} 
                                    className={`py-1 text-sm flex items-center justify-between ${user.id === socket.id ? 'text-blue-600 font-bold' : 'text-gray-700'}`}
                                >
                                    <span>{user.username} {user.id === socket.id && '(You)'}</span>
                                    
                                    {user.id !== socket.id && (
                                        <PrivateMessageSender recipient={user} />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Message Display Area */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <div className="message-log flex-1 overflow-y-auto pr-2 space-y-2">
                        {isLoadingHistory && (
                             <div className="text-center py-4 text-blue-500 font-medium">
                                Loading history...
                            </div>
                        )}
                        
                        {filteredMessages.map(renderMessage)}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Typing Indicator */}
                    <div className="text-sm text-gray-500 mt-2 h-6 pl-2">
                        {typingUsers.filter(u => u !== currentUser).join(', ')} 
                        {typingUsers.filter(u => u !== currentUser).length > 0 ? ' is typing in this room...' : ''} 
                    </div>
                    
                    {/* Message Input Form */}
                    <form onSubmit={handleSendMessage} className="flex pt-3 border-t border-gray-300">
                        <input
                            type="text"
                            placeholder={`Send a message to #${currentRoom}...`}
                            value={inputMessage}
                            onChange={handleTyping}
                            disabled={!isConnected}
                            className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputMessage.trim() || !isConnected}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-150"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ChatApp;
