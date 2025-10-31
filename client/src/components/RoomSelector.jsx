// client/src/components/RoomSelector.jsx

import React from 'react';

function RoomSelector({ currentRoom, availableRooms, joinRoom }) {
    return (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-semibold mb-2 text-gray-700">Channels</h4>
            <div className="space-y-1">
                {availableRooms.map((room) => (
                    <button
                        key={room}
                        onClick={() => joinRoom(room)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition duration-150 
                            ${currentRoom === room
                                ? 'bg-blue-600 text-white font-bold shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        # {room}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default RoomSelector;