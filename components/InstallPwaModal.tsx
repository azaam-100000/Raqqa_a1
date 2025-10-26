import React from 'react';
import ReactDOM from 'react-dom';
import Button from './ui/Button';

// Re-using the store icon from AuthLayout
const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-teal-400">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/>
  </svg>
);

interface InstallPwaModalProps {
    installPrompt: Event;
    onClose: () => void;
}

const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ installPrompt, onClose }) => {
    const modalRoot = document.getElementById('modal-root');

    const handleInstallClick = async () => {
        const promptEvent = installPrompt as any;
        if (!promptEvent) {
            return;
        }
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        onClose();
    };

    if (!modalRoot) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
            <div 
                className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center p-8 text-center text-white"
                onClick={e => e.stopPropagation()}
            >
                <StoreIcon />
                <h2 className="text-3xl font-bold mt-6">ثبّت التطبيق</h2>
                <p className="text-zinc-400 mt-2 mb-8">
                    أضف تطبيق سوق الرقة إلى شاشتك الرئيسية للوصول السريع والاستفادة من كامل الميزات.
                </p>
                <div className="w-full space-y-3">
                     <Button onClick={handleInstallClick}>
                        تثبيت التطبيق
                    </Button>
                     <Button variant="secondary" onClick={onClose}>
                        لاحقاً
                    </Button>
                </div>
            </div>
        </div>
    );
    
    return ReactDOM.createPortal(modalContent, modalRoot);
};

// Add keyframes for animation
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out forwards;
    }
`;
document.head.appendChild(style);

export default InstallPwaModal;