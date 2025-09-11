import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Column from './Column';
import api from '../services/api';
import socketService from '../services/socket';
import { DragDropContext } from 'react-beautiful-dnd';
import { StrictDroppable } from './StrictDroppable';

const BoardView = () => {
    const { id } = useParams();
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [isLoadingAction, setIsLoadingAction] = useState(false);

    const fetchBoard = async () => {
        try {
            setLoading(true);
            const response = await api.getBoard(id);
            const sortedBoard = {
                ...response.data,
                Columns: response.data.Columns.sort((a, b) => a.order - b.order).map(column => ({
                    ...column,
                    Cards: column.Cards.sort((a, b) => a.order - b.order)
                }))
            };
            setBoard(sortedBoard);
            setError(null);
        } catch (error) {
            console.error('Error fetching board:', error);
            setError('Failed to load board');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        socketService.connect();
        fetchBoard();
        socketService.joinBoard(id);

        const handleBoardUpdate = (updatedBoard) => {
            const sortedBoard = {
                ...updatedBoard,
                Columns: updatedBoard.Columns.sort((a, b) => a.order - b.order).map(column => ({
                    ...column,
                    Cards: column.Cards.sort((a, b) => a.order - b.order)
                }))
            };
            setBoard(sortedBoard);
        };
        socketService.onBoardUpdated(handleBoardUpdate);

        const handleNotification = ({ message, type }) => {
            if (type === 'success') {
                toast.success(message);
            } else if (type === 'error') {
                toast.error(message);
            } else {
                toast(message);
            }
        };
        socketService.on('notification', handleNotification);

        return () => {
            socketService.leaveBoard(id);
            if (socketService.socket) {
                socketService.socket.off("board_updated", handleBoardUpdate);
                socketService.socket.off("notification", handleNotification);
            }
        };
    }, [id]);

    const onDragEnd = (result) => {
        const { destination, source, draggableId, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'COLUMN') {
            const newColumnOrder = Array.from(board.Columns);
            const [movedColumn] = newColumnOrder.splice(source.index, 1);
            newColumnOrder.splice(destination.index, 0, movedColumn);
            const orderedIds = newColumnOrder.map(col => col.id);
            api.reorderColumns(board.id, orderedIds).catch(err => console.error("Failed to reorder columns", err));
            return;
        }

        api.moveCard(draggableId, {
            newColumnId: destination.droppableId,
            newOrder: destination.index,
        }).catch(err => console.error("Failed to move card", err));
    };
    
    const handleAddColumn = async () => {
      if (!newColumnTitle.trim()) return;
      setIsLoadingAction(true);
      try {
        await api.createColumn(id, { title: newColumnTitle.trim() });
        setNewColumnTitle('');
        setIsAddingColumn(false);
      } catch (error) {
        console.error('Error creating column:', error);
      } finally {
        setIsLoadingAction(false);
      }
    };

    const handleCancelAddColumn = () => {
      setIsAddingColumn(false);
      setNewColumnTitle('');
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddColumn();
      }
      if (e.key === 'Escape') {
        handleCancelAddColumn();
      }
    };
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="min-h-screen bg-slate-100">
                <div className="bg-white shadow-sm border-b border-gray-300">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="bg-blue-600 text-white p-2 rounded-lg mr-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2M13 7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{board?.name}</h1>
                                    <p className="text-sm text-gray-600 mt-1">Project Management Board</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                <div className="text-sm font-medium text-gray-700">{board?.Columns?.length || 0} Columns</div>
                                <div className="text-xs text-gray-500">{board?.Columns?.reduce((total, col) => total + (col.Cards?.length || 0), 0)} Total Cards</div>
                            </div>
                        </div>
                    </div>
                </div>

                <StrictDroppable droppableId="all-columns" direction="horizontal" type="COLUMN">
                    {(provided) => (
                        <div className="p-6 flex gap-6 overflow-x-auto pb-4" {...provided.droppableProps} ref={provided.innerRef}>
                            {board?.Columns?.map((column, index) => (
                                <Column key={column.id} column={column} index={index} />
                            ))}
                            {provided.placeholder}
                            {isAddingColumn ? (
                                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 w-80 flex-shrink-0">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Column</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Column Title</label>
                                            <input type="text" value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} onKeyDown={handleKeyPress} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter column title..." disabled={isLoadingAction} autoFocus />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={handleAddColumn} disabled={isLoadingAction || !newColumnTitle.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isLoadingAction ? 'Adding...' : 'Add Column'}</button>
                                            <button onClick={handleCancelAddColumn} disabled={isLoadingAction} className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-shrink-0">
                                    <button onClick={() => setIsAddingColumn(true)} className="bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600 rounded-lg p-6 w-80 text-center transition-all duration-200 group">
                                        <div className="space-y-2">
                                            <div className="bg-gray-100 group-hover:bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                            </div>
                                            <div className="font-medium">Add Column</div>
                                            <div className="text-sm text-gray-500">Create a new column for your tasks</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </StrictDroppable>
            </div>
        </DragDropContext>
    );
};

export default BoardView;
