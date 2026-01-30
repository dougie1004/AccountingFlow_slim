import React, { useState } from 'react';
import { X, FileText, ZoomIn, ZoomOut, Printer, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry } from '../types';

interface EvidenceViewerProps {
    isOpen: boolean;
    onClose: () => void;
    entry: JournalEntry | null;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ isOpen, onClose, entry }) => {
    const [zoom, setZoom] = useState(100);

    if (!isOpen || !entry) return null;

    const evidenceUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#151D2E] w-full max-w-6xl h-[85vh] rounded-3xl border border-white/10 shadow-2xl flex overflow-hidden"
                >
                    <div className="flex-1 flex flex-col border-r border-white/5 bg-[#0B1221] relative">
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#151D2E]/50">
                            <div className="flex items-center gap-4">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-400" />
                                    Digital Evidence Viewer
                                </h3>
                                <span className="text-xs font-mono text-slate-500">{entry.id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-2 text-slate-400 hover:text-white"><ZoomOut size={18} /></button>
                                <span className="text-xs font-mono text-slate-400 w-12 text-center">{zoom}%</span>
                                <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-2 text-slate-400 hover:text-white"><ZoomIn size={18} /></button>
                                <button className="p-2 text-slate-400 hover:text-white"><Printer size={18} /></button>
                                <button className="p-2 text-slate-400 hover:text-white"><Download size={18} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                            <motion.img
                                src={evidenceUrl}
                                style={{ width: `${zoom}%` }}
                                className="rounded-lg shadow-2xl"
                            />
                        </div>
                    </div>

                    <div className="w-96 bg-[#151D2E] flex flex-col p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <h2 className="text-lg font-black text-white">Evidence Details</h2>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase">Vendor</label>
                                <div className="p-3 bg-white/5 rounded-xl text-white font-bold">{entry.vendor || 'Unknown'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase">Amount</label>
                                <div className="p-3 bg-white/5 rounded-xl text-white font-bold font-mono">₩{entry.amount.toLocaleString()}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase">Description</label>
                                <div className="p-3 bg-white/5 rounded-xl text-slate-300 font-bold">{entry.description}</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pt-6 border-t border-white/5">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-4">Control Trail</label>
                            <div className="space-y-4 text-xs">
                                {entry.controlTrail?.map((log, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                                        <p className="text-slate-300 font-bold">{log}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
