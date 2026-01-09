import { useContext } from 'react';
import { AccountingContext } from '../context/AccountingContext';

export function useAccounting() {
    const context = useContext(AccountingContext);
    if (context === undefined) {
        throw new Error('useAccounting must be used within an AccountingProvider');
    }
    return context;
}
