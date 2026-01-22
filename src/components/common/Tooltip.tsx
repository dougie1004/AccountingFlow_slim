import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useHover,
    useFocus,
    useDismiss,
    useRole,
    useInteractions,
    arrow,
    Side,
} from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const arrowRef = useRef(null);

    // Use a manual portal root to guarantee Z-Index supremacy
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

    useLayoutEffect(() => {
        setPortalRoot(document.getElementById('tooltip-root'));
    }, []);

    const { x, y, refs, strategy, context, placement, middlewareData } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: position,
        strategy: 'fixed',
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(10),
            flip({
                fallbackAxisSideDirection: 'start',
            }),
            shift({ padding: 5 }),
            arrow({ element: arrowRef })
        ],
    });

    const hover = useHover(context, { move: false, delay });
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'tooltip' });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role,
    ]);

    const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
    }[placement.split('-')[0] as Side];

    return (
        <>
            <span
                ref={refs.setReference}
                {...getReferenceProps()}
                className="inline-flex items-center cursor-help"
                style={{ display: 'inline-flex' }}
            >
                {children}
            </span>
            {portalRoot && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={refs.setFloating}
                            style={{
                                position: strategy,
                                top: y ?? 0,
                                left: x ?? 0,
                                width: 'max-content',
                                maxWidth: '260px',
                                // Note: Actual Z-Index is handled by #tooltip-root in CSS, 
                                // but we add it here too just in case.
                                zIndex: 2147483647,
                                pointerEvents: 'none',
                            }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: 'easeOut' }}
                            {...getFloatingProps()}
                        >
                            <div className="relative p-3 bg-slate-900/98 text-white text-[11px] font-bold leading-relaxed rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl ring-1 ring-white/10">
                                {content}
                                <div
                                    ref={arrowRef}
                                    style={{
                                        position: 'absolute',
                                        left: middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
                                        top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}px` : '',
                                        [staticSide]: '-4px',
                                    }}
                                    className="w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45 transform"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                portalRoot
            )}
        </>
    );
};
