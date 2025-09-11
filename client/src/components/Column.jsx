import React, { useState } from 'react';
import Card from './Card';
import api from '../services/api';
import { Draggable } from 'react-beautiful-dnd';
import { StrictDroppable } from './StrictDroppable';

const Column = ({ column, index }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(column.title);
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardDescription, setNewCardDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSaveTitle = async () => {
        if (!title.trim() || title.trim() === column.title) {
            setIsEditing(false);
            return;
        }
        setIsLoading(true);
        try {
            await api.updateColumn(column.id, { title: title.trim() });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating column:', error);
            setTitle(column.title);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCancelEdit = () => {
        setTitle(column.title);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this column?')) {
            try {
                await api.deleteColumn(column.id);
            } catch (error) {
                console.error('Error deleting column:', error);
            }
        }
    };

    const handleAddCard = async () => {
        if (!newCardTitle.trim()) return;
        setIsLoading(true);
        try {
            await api.createCard(column.id, { title: newCardTitle.trim(), description: newCardDescription.trim() || null });
            setNewCardTitle('');
            setNewCardDescription('');
            setIsAddingCard(false);
        } catch (error) {
            console.error('Error creating card:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyPress = (e, action) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            action();
        }
        if (e.key === 'Escape') {
            if (action === handleSaveTitle) handleCancelEdit();
            else {
                setIsAddingCard(false);
                setNewCardTitle('');
                setNewCardDescription('');
            }
        }
    };

    return (
        <Draggable draggableId={column.id} index={index}>
            {(provided) => (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 w-80 flex-shrink-0 flex flex-col" {...provided.draggableProps} ref={provided.innerRef}>
                    <div className="border-b border-gray-200 p-4" {...provided.dragHandleProps}>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Column Title</label>
                                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => handleKeyPress(e, handleSaveTitle)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={isLoading} autoFocus />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveTitle} disabled={isLoading || !title.trim()} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isLoading ? 'Saving...' : 'Save'}</button>
                                    <button onClick={handleCancelEdit} disabled={isLoading} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="cursor-pointer flex-1 group" onClick={() => setIsEditing(true)}>
                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{column.title}</h3>
                                    <div className="flex items-center mt-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{column.Cards?.length || 0} cards</span>
                                    </div>
                                </div>
                                <button onClick={handleDelete} disabled={isLoading} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors" title="Delete column">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    <StrictDroppable droppableId={column.id} type="CARD">
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className={`p-4 space-y-3 min-h-[100px] flex-grow transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}>
                                {column.Cards.map((card, cardIndex) => (
                                    <Card key={card.id} card={card} index={cardIndex} />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </StrictDroppable>
                    <div className="border-t border-gray-200 p-4">
                        {isAddingCard ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Title</label>
                                    <input type="text" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} onKeyDown={(e) => handleKeyPress(e, handleAddCard)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter card title..." disabled={isLoading} autoFocus />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <textarea value={newCardDescription} onChange={(e) => setNewCardDescription(e.target.value)} onKeyDown={(e) => handleKeyPress(e, handleAddCard)} className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Add a description..." rows="2" disabled={isLoading} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddCard} disabled={isLoading || !newCardTitle.trim()} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isLoading ? 'Adding...' : 'Add Card'}</button>
                                    <button onClick={() => { setIsAddingCard(false); setNewCardTitle(''); setNewCardDescription(''); }} disabled={isLoading} className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsAddingCard(true)} disabled={isLoading} className="w-full p-3 text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all duration-200 group disabled:opacity-50">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="bg-gray-100 group-hover:bg-blue-50 w-6 h-6 rounded-full flex items-center justify-center transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    </div>
                                    <span className="text-sm font-medium">Add Card</span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default Column;