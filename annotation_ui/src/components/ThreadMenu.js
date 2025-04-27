import React, { useState } from 'react';
import './ThreadMenu.css';

const ThreadMenu = ({ 
    thread, 
    onTagEdit, 
    isEditing = false,
    isLoading = false,
    error = null 
}) => {
    const [editingTags, setEditingTags] = useState(isEditing);
    const [newTags, setNewTags] = useState(thread.tags || []);

    const handleTagSubmit = async (e) => {
        e.preventDefault();
        try {
            await onTagEdit(thread.id, newTags);
            setEditingTags(false);
        } catch (err) {
            console.error('Error updating thread tags:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="thread-menu loading">
                <div className="loading-spinner"></div>
                <span>Loading thread...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="thread-menu error">
                <span className="error-message">{error}</span>
            </div>
        );
    }

    return (
        <div className="thread-menu">
            <div className="thread-header">
                <h3>Thread {thread.id}</h3>
                <div className="thread-stats">
                    <span>{thread.message_count} messages</span>
                    <span>{thread.annotator_count} annotators</span>
                </div>
            </div>

            {editingTags ? (
                <form onSubmit={handleTagSubmit} className="tag-edit-form">
                    <input
                        type="text"
                        value={newTags.join(', ')}
                        onChange={(e) => setNewTags(e.target.value.split(',').map(tag => tag.trim()))}
                        placeholder="Enter tags, separated by commas"
                        className="tag-input"
                    />
                    <div className="form-actions">
                        <button type="submit" className="save-button">Save</button>
                        <button 
                            type="button" 
                            className="cancel-button"
                            onClick={() => {
                                setEditingTags(false);
                                setNewTags(thread.tags || []);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="thread-tags">
                    {thread.tags && thread.tags.length > 0 ? (
                        thread.tags.map((tag, index) => (
                            <span key={index} className="tag">
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span className="no-tags">No tags assigned</span>
                    )}
                    <button 
                        className="edit-tags-button"
                        onClick={() => setEditingTags(true)}
                    >
                        Edit Tags
                    </button>
                </div>
            )}
        </div>
    );
};

export default ThreadMenu;