import React, { useEffect } from 'react';
import './Modal.css';

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = "medium",
    showCloseButton = true,
    closeOnOverlayClick = true
}) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className={`modal-content ${size}`}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    {showCloseButton && (
                        <button 
                            className="modal-close-button" 
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal; 