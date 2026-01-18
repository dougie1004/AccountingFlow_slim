import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PiiTextProps {
    text: string;
    type?: 'name' | 'phone' | 'rrn' | 'email' | 'auto';
    className?: string;
}

export const PiiText: React.FC<PiiTextProps> = ({ text, type = 'auto', className = "" }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    // Basic detection if type is auto
    let isSensitive = false;
    let maskedText = text;

    if (!text) return <span className={className}>-</span>;

    const nameRegex = /^[가-힣]{2,4}$/; // Simple Korean name detection (2-4 chars)
    const phoneRegex = /\d{3}-\d{3,4}-\d{4}/;
    const rrnRegex = /\d{6}-?[1-4]\d{6}/;

    if (type === 'name' || (type === 'auto' && nameRegex.test(text) && text !== "주식회사" && !text.endsWith("회사"))) {
        isSensitive = true;
        maskedText = text.substring(0, 1) + "*" + (text.length > 2 ? text.substring(2) : "");
    } else if (type === 'phone' || (type === 'auto' && phoneRegex.test(text))) {
        isSensitive = true;
        maskedText = text.replace(/(\d{3})-(\d{3,4})-(\d{4})/, "$1-****-$3");
    }

    if (!isSensitive) {
        return <span className={className}>{text}</span>;
    }

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isRevealed;
        setIsRevealed(newState);

        if (newState) {
            console.log(`[Audit Log] PII Revealed by User: ${maskedText} -> ${text} at ${new Date().toISOString()}`);
            // In a real app, invoke backend to log this access
        }
    };

    return (
        <span
            className={`group relative inline-flex items-center gap-1 cursor-pointer select-none transition-all ${isRevealed ? 'text-rose-300 bg-rose-950/30 px-1.5 rounded' : 'hover:bg-white/5 px-1.5 rounded'} ${className}`}
            onClick={handleToggle}
            title={isRevealed ? "Click to mask" : "Click to reveal (Logged)"}
        >
            {isRevealed ? (
                <>
                    {text}
                    <EyeOff size={10} className="opacity-50" />
                </>
            ) : (
                <>
                    {maskedText}
                    <Lock size={10} className="opacity-50 group-hover:text-indigo-400" />
                </>
            )}
        </span>
    );
};
