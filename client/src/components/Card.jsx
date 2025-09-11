import React, { useState } from 'react';
import api from '../services/api';
import { Draggable } from 'react-beautiful-dnd';

const Card = ({ card, index }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(card.title);
    const [description, setDescription] = useState(card.description || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsLoading(true);
        try {
            await api.updateCard(card.id, {
                title: title.trim(),
                description: description.trim() || null
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating card:', error);
            setTitle(card.title);
            setDescription(card.description || '');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCancel = () => {
        setTitle(card.title);
        setDescription(card.description || '');
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this card?')) {
            setIsLoading(true);
            try {
                await api.deleteCard(card.id);
            } catch (error) {
                console.error('Error deleting card:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 relative">
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Card Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyPress} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter card title..." disabled={isLoading} autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} onKeyDown={handleKeyPress} className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Add a description..." rows="3" disabled={isLoading} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={handleSave} disabled={isLoading || !title.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isLoading ? 'Saving...' : 'Save Changes'}</button>
                        <button onClick={handleCancel} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Draggable draggableId={card.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200 group relative ${snapshot.isDragging ? 'shadow-lg border-blue-500 ring-2 ring-blue-500' : ''}`}
                    onClick={() => setIsEditing(true)}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-5">{card.title}</h4>
                            {card.description && (<p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{card.description}</p>)}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={isLoading} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 disabled:opacity-50" title="Delete card">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                <span>Task</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to edit</div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default Card;