// client/src/components/PrivateMessageSender.jsx

import React, { useState } from 'react';
import { useSocket } from '../socket/socket';

function PrivateMessageSender({ recipient }) {
    const { sendPrivateMessage } = useSocket();
    const [modalOpen, setModalOpen] = useState(false);
    const [pmText, setPmText] = useState('');

    const handleSendPM = (e) => {
        e.preventDefault();
        if (pmText.trim()) {
            // Send the private message using the recipient's socket ID
            sendPrivateMessage(recipient.id, pmText.trim());
            setPmText('');
            setModalOpen(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-2 p-1 rounded transition duration-150"
                title={`Message ${recipient.username} privately`}
            >
                [PM]
            </button>

            {/* Tailwind Modal Component */}
            {modalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-xl font-semibold">
                                Private Message to @{recipient.username}
                            </h3>
                            <button 
                                onClick={() => setModalOpen(false)}
                                className="text-gray-500 hover:text-gray-800 text-2xl"
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSendPM}>
                            <textarea
                                value={pmText}
                                onChange={(e) => setPmText(e.target.value)}
                                placeholder={`Write your private message for ${recipient.username}...`}
                                rows="4"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                                required
                            />
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-150"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!pmText.trim()}
                                    className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition duration-150"
                                >
                                    Send Private Message
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default PrivateMessageSender;