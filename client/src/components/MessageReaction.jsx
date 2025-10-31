// client/src/components/MessageReaction.jsx (CORRECTED)

import React, { useState } from 'react';
import { useSocket } from '../socket/socket.js';

const availableReactions = {
    '👍': 'Like',
    '❤️': 'Love',
    '😂': 'Haha',
    '😮': 'Wow',
};

function MessageReaction({ message, senderId }) {
    // Destructure socket and users array from the hook
    const { sendReaction, socket, users } = useSocket();
    const [showPicker, setShowPicker] = useState(false);

    // FIX: Correctly determine the current user's username
    const currentUsername = users.find(u => u.id === socket.id)?.username;

    // Determine if the current user has used this reaction
    const hasUserReacted = (reactionKey) => {
        const reactionData = message.reactions?.[reactionKey];
        if (!reactionData || !currentUsername) return false;
        
        // Check if the current logged-in user's username is in the reaction list
        return reactionData.users.includes(currentUsername); 
    };

    const handleReactionClick = (reactionKey) => {
        // We only send the message ID and the reaction emoji
        sendReaction(message.id, reactionKey);
        setShowPicker(false);
    };

    // Helper to get reaction count for display
    const getReactionCount = (reactionKey) => {
        return message.reactions?.[reactionKey]?.count || 0;
    };

    // Generate tooltips for reactions (e.g., "User1, User2 reacted with 👍")
    const getReactionTooltip = (reactionKey) => {
        const users = message.reactions?.[reactionKey]?.users;
        if (!users || users.length === 0) return '';
        return users.join(', ');
    };

    // Check if the message is from the current user
    const isOwnMessage = senderId === socket.id;

    return (
        <div className={`relative mt-1 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {/* Display existing reactions */}
            {message.reactions && 
                Object.keys(message.reactions).map(key => {
                    const count = getReactionCount(key);
                    if (count > 0) {
                        return (
                            <span 
                                key={key} 
                                className={`flex items-center text-xs px-2 py-0.5 rounded-full border border-gray-300 mr-1 cursor-pointer 
                                    ${hasUserReacted(key) ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-100'}`}
                                onClick={() => handleReactionClick(key)}
                                title={getReactionTooltip(key)}
                            >
                                {key} {count}
                            </span>
                        );
                    }
                    return null;
                })
            }

            {/* Reaction Button (Plus sign or emoji) */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-gray-500 hover:text-gray-800 text-lg ml-2 p-1 rounded-full hover:bg-gray-200 transition duration-150"
                title="Add Reaction"
            >
                +
            </button>

            {/* Reaction Picker Pop-up */}
            {showPicker && (
                <div 
                    className={`absolute z-10 p-2 bg-white rounded-xl shadow-2xl flex space-x-2 
                        ${isOwnMessage ? 'right-0 -top-12' : 'left-0 -top-12'}`}
                    onMouseLeave={() => setShowPicker(false)}
                >
                    {Object.keys(availableReactions).map(emoji => (
                        <button
                            key={emoji}
                            className="text-2xl p-1 rounded-full hover:bg-gray-100 transition duration-100"
                            title={availableReactions[emoji]}
                            onClick={() => handleReactionClick(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MessageReaction;