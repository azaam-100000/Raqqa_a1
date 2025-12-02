import React from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from './ui/Button';

const LoginRequiredModal: React.FC = () => {
    const { loginModalOpen, setLoginModalOpen } = useAuth();
    const navigate = useNavigate();
    const modalRoot = document.getElementById('modal-root');

    if (!loginModalOpen || !modalRoot) return null;

    const handleLogin = () => {
        setLoginModalOpen(false);
        navigate('/login');
    };

    const handleCancel = () => {
        setLoginModalOpen(false);
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
            <div 
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center p-8 text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-teal-100 dark:bg-teal-900/30 p-4 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">تسجيل الدخول مطلوب</h2>
                <p className="text-gray-600 dark:text-zinc-400 mb-8">
                    عذراً، يجب عليك تسجيل الدخول لاستخدام هذه الميزة.
                </p>
                <div className="w-full space-y-3">
                     <Button onClick={handleLogin}>
                        تسجيل الدخول
                    </Button>
                     <Button variant="secondary" onClick={handleCancel}>
                        إلغاء
                    </Button>
                </div>
            </div>
        </div>
    );
    
    return ReactDOM.createPortal(modalContent, modalRoot);
};

export default LoginRequiredModal;