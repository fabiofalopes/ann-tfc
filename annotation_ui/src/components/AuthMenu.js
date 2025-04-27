import React, { useState } from 'react';
import { auth } from '../utils/api';
import './AuthMenu.css';

const AuthMenu = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        try {
            await auth.login(email, password);
            // Get user details after successful login
            const userData = await auth.getCurrentUser();
            onLogin(userData);
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'An error occurred during authentication');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-menu">
            <div className="auth-form-container">
                <h2>Welcome Back</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                    {error && <div className="auth-error">{error}</div>}
                    <button 
                        type="submit" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthMenu;