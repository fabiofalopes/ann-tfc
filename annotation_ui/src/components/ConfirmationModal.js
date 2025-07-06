import React from 'react';
import Modal from './Modal';
import './ConfirmationModal.css';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning", // "warning", "danger", "info"
    isLoading = false
}) => {
    const handleConfirm = () => {
        onConfirm();
        if (!isLoading) {
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="small"
            closeOnOverlayClick={!isLoading}
        >
            <div className={`confirmation-modal ${type}`}>
                <div className="confirmation-icon">
                    {type === 'danger' && '⚠️'}
                    {type === 'warning' && '⚠️'}
                    {type === 'info' && 'ℹ️'}
                </div>
                <div className="confirmation-message">
                    <p>{message}</p>
                </div>
                <div className="confirmation-actions">
                    <button 
                        className="cancel-button"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button 
                        className={`confirm-button ${type}`}
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal; 