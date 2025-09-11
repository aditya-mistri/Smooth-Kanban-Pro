import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import socketService from '../services/socket';

// --- Helper Components ---

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// Icon component for features
const FeatureIcon = ({ children }) => (
    <div className="bg-blue-100 text-blue-600 rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0">
        {children}
    </div>
);

// --- Main Dashboard Component ---

const Dashboard = () => {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal & Form State
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [boardToEdit, setBoardToEdit] = useState(null);
    const [boardToDelete, setBoardToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Socket Connection
        if (!socketService.socket) {
            socketService.connect();
        }

        // Initial Data Fetch
        const fetchBoards = async () => {
            try {
                setLoading(true);
                const response = await api.getAllBoards();
                setBoards(response.data);
            } catch (err) {
                setError('Failed to fetch boards. Please try again later.');
                toast.error('Could not fetch boards.');
            } finally {
                setLoading(false);
            }
        };
        fetchBoards();

        // Socket Event Handlers
        const handleBoardCreated = (newBoard) => {
            setBoards(prev => [newBoard, ...prev]);
            toast.success(`New board "${newBoard.name}" was created!`);
        };
        const handleBoardUpdated = (updatedBoard) => {
            setBoards(prev => prev.map(b => b.id === updatedBoard.id ? updatedBoard : b));
        };
        const handleBoardDeleted = ({ id }) => {
            setBoards(prev => prev.filter(b => b.id !== id));
        };
        
        socketService.on('board_created', handleBoardCreated);
        socketService.on('board_updated', handleBoardUpdated);
        socketService.on('board_deleted', handleBoardDeleted);

        // Cleanup
        return () => {
            socketService.socket.off('board_created', handleBoardCreated);
            socketService.socket.off('board_updated', handleBoardUpdated);
            socketService.socket.off('board_deleted', handleBoardDeleted);
        };
    }, []);

    // --- CRUD Handlers ---
    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoardName.trim()) return toast.error('Board name is required.');
        setIsSubmitting(true);
        try {
            await api.createBoard({ name: newBoardName });
            setCreateModalOpen(false);
            setNewBoardName('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create board.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdateBoard = async (e) => {
        e.preventDefault();
        if (!boardToEdit?.name.trim()) return toast.error('Board name is required.');
        setIsSubmitting(true);
        try {
            await api.updateBoard(boardToEdit.id, { name: boardToEdit.name });
            toast.success('Board renamed successfully!');
            setEditModalOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to rename board.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBoard = async () => {
        if (!boardToDelete) return;
        setIsSubmitting(true);
        try {
            await api.deleteBoard(boardToDelete.id);
            toast.success(`Board "${boardToDelete.name}" deleted.`);
            setDeleteModalOpen(false);
        } catch (err) {
            toast.error('Failed to delete board.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Modal Control ---
    const openEditModal = (board) => { setBoardToEdit({ ...board }); setEditModalOpen(true); };
    const openDeleteModal = (board) => { setBoardToDelete(board); setDeleteModalOpen(true); };
    
    // --- Render Logic ---
    if (loading) return <div className="flex justify-center items-center h-screen text-xl">Loading boards...</div>;
    if (error) return <div className="flex justify-center items-center h-screen text-xl text-red-500">{error}</div>;

    return (
        <div className="flex min-h-screen bg-slate-100">
            {/* Left Information Sidebar */}
            <aside className="w-80 bg-white border-r border-gray-200 p-8 hidden lg:block flex-shrink-0">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2M13 7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Kanban Pro</h1>
                </div>

                <p className="text-gray-600 text-sm mb-8">
                    A real-time, collaborative Kanban board to help you manage projects and tasks efficiently.
                </p>

                <div className="space-y-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Key Features</h2>
                    <ul className="space-y-5">
                        <li className="flex items-start gap-4">
                            <FeatureIcon><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.128 19.825A1.586 1.586 0 0110.4 19.5v.001c.969-.323 1.586-.93 1.586-1.842 0-.912-.617-1.519-1.586-1.842v-.001a1.586 1.586 0 01-2.272.275l-.275-.275a1.586 1.586 0 01-.275-2.272l.001-.001c.323-.969.93-1.586 1.842-1.586.912 0 1.519.617 1.842 1.586l.001.001a1.586 1.586 0 01-2.272 2.272l.275.275a1.586 1.586 0 012.272.275l-.001-.001c.969.323 1.586.93 1.586 1.842 0 .912-.617 1.519-1.586 1.842a1.586 1.586 0 01-2.272-.275l-.275-.275a1.586 1.586 0 01-.275-2.272l.001-.001c.323-.969.93-1.586 1.842-1.586.912 0 1.519.617 1.842 1.586l-.001.001a1.586 1.586 0 012.272 2.272l-.275-.275a1.586 1.586 0 01-2.272-.275v.001c-.969-.323-1.586-.93-1.586-1.842 0-.912.617-1.519 1.586-1.842v.001a1.586 1.586 0 012.272.275l.275.275a1.586 1.586 0 01.275 2.272l-.001.001c-.323.969-.93 1.586-1.842 1.586-.912 0-1.519-.617-1.842-1.586l-.001-.001a1.586 1.586 0 01-2.272-2.272l.275-.275a1.586 1.586 0 012.272-.275v.001z"></path></svg></FeatureIcon>
                            <div>
                                <h3 className="font-semibold text-gray-800">Real-time Updates</h3>
                                <p className="text-sm text-gray-500">Changes reflect instantly for all users.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                           <FeatureIcon><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></FeatureIcon>
                            <div>
                                <h3 className="font-semibold text-gray-800">Drag & Drop</h3>
                                <p className="text-sm text-gray-500">Intuitively organize tasks and columns.</p>
                            </div>
                        </li>
                         <li className="flex items-start gap-4">
                           <FeatureIcon><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg></FeatureIcon>
                            <div>
                                <h3 className="font-semibold text-gray-800">Dynamic Boards</h3>
                                <p className="text-sm text-gray-500">Create and manage projects your way.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1">
                <header className="bg-white/60 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">My Boards</h2>
                        <button onClick={() => setCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors text-sm flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            Create New Board
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {boards.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {boards.map(board => {
                                const columnCount = board.Columns?.length || 0;
                                const cardCount = board.Columns?.reduce((sum, col) => sum + (col.Cards?.length || 0), 0) || 0;
                                return (
                                    <div key={board.id} className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-blue-400 transition-all duration-300 flex flex-col">
                                        <Link to={`/boards/${board.id}`} className="p-5 flex-grow block">
                                            <h3 className="text-lg font-bold text-gray-800 truncate" title={board.name}>{board.name}</h3>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                                                <span><strong>{columnCount}</strong> {columnCount === 1 ? 'Column' : 'Columns'}</span>
                                                <span className="text-gray-300">|</span>
                                                <span><strong>{cardCount}</strong> {cardCount === 1 ? 'Card' : 'Cards'}</span>
                                            </div>
                                        </Link>
                                        <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-2 flex justify-end gap-3">
                                            <button onClick={() => openEditModal(board)} className="text-xs font-medium text-blue-600 hover:text-blue-800">Rename</button>
                                            <button onClick={() => openDeleteModal(board)} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                            <h3 className="text-xl font-semibold text-gray-800">No boards yet!</h3>
                            <p className="text-gray-500 mt-2">Get started by creating your first project board.</p>
                            <button onClick={() => setCreateModalOpen(true)} className="mt-6 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                                Create a Board
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* Modals */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create a New Board">
                <form onSubmit={handleCreateBoard}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Board Name</label>
                    <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Q4 Marketing Plan" autoFocus />
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Rename Board">
                <form onSubmit={handleUpdateBoard}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Board Name</label>
                    <input type="text" value={boardToEdit?.name || ''} onChange={(e) => setBoardToEdit({...boardToEdit, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Board">
                <p>Are you sure you want to delete the board "<strong>{boardToDelete?.name}</strong>"? This action is permanent.</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleDeleteBoard} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50">{isSubmitting ? 'Deleting...' : 'Delete'}</button>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
