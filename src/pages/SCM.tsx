import React, { useState } from 'react';
import { ShoppingCart, Package, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { Order } from '../types';
import { invoke } from '@tauri-apps/api/core';

export const SCM: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([
        {
            id: 'PO-2025-001',
            date: '2025-03-01',
            partnerId: 'Dell Korea',
            typeField: 'PURCHASE',
            status: 'CONFIRMED',
            items: [{ sku: 'LTP-001', quantity: 10, unitPrice: 1500000, amount: 15000000 }],
            totalAmount: 15000000,
            vat: 1500000
        },
        {
            id: 'SO-2025-001',
            date: '2025-03-05',
            partnerId: 'TechGiant Inc.',
            typeField: 'SALES',
            status: 'CONFIRMED',
            items: [{ sku: 'SVC-001', quantity: 1, unitPrice: 50000000, amount: 50000000 }],
            totalAmount: 50000000,
            vat: 5000000
        }
    ]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Optimistic UI Update
        const updatedOrder = { ...order, status: newStatus as any };
        setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));

        try {
            // Trigger Auto-Journaling
            if ((order.typeField === 'PURCHASE' && newStatus === 'FULFILLED') ||
                (order.typeField === 'SALES' && newStatus === 'INVOICED')) {

                const entries = await invoke('process_scm_order', { order: updatedOrder });
                alert(`Auto-Journaling Complete!\n${(entries as any[]).length} Journal Entries Generated.`);
            }
        } catch (e) {
            console.error(e);
            alert('Auto-Journaling Failed: ' + e);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider">SCM Module</h2>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">구매/판매 (SCM)</h1>
                    <p className="mt-2 text-slate-500 font-medium">주문 관리 및 자동 전표 생성</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    <Plus size={18} />
                    New Order
                </button>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl ${order.typeField === 'PURCHASE' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {order.typeField === 'PURCHASE' ? <Package size={24} /> : <CheckCircle size={24} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{order.id}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${order.typeField === 'PURCHASE' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {order.typeField}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{order.partnerId}</h3>
                                <p className="text-sm text-slate-500">₩{order.totalAmount.toLocaleString()} (Items: {order.items.length})</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right mr-4">
                                <p className="text-xs font-bold text-slate-400 uppercase">Current Status</p>
                                <p className="font-bold text-slate-700">{order.status}</p>
                            </div>

                            {order.status === 'CONFIRMED' && (
                                <button
                                    onClick={() => handleStatusChange(order.id, order.typeField === 'PURCHASE' ? 'FULFILLED' : 'INVOICED')}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-indigo-600 transition-colors flex items-center gap-2"
                                >
                                    Proceed to {order.typeField === 'PURCHASE' ? 'Goods Receipt' : 'Invoice'}
                                    <ArrowRight size={16} />
                                </button>
                            )}
                            {order.status !== 'CONFIRMED' && order.status !== 'DRAFT' && (
                                <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg font-bold text-sm flex items-center gap-2">
                                    <CheckCircle size={16} /> Completed
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
