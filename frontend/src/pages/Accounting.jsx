import React, { useState, useEffect } from 'react';
import { FileText, Plus, BookOpen, TrendingUp, Wallet, DollarSign, Settings, Trash2, Edit3, Download, Save, Users, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Accounting = () => {
    const [activeTab, setActiveTab] = useState('journal'); // Default to Journal
    const [trialBalance, setTrialBalance] = useState([]);
    const [accounts, setAccounts] = useState([]);
    // const [expenses, setExpenses] = useState([]); // Removed
    const [profitLoss, setProfitLoss] = useState({});
    const [balanceSheet, setBalanceSheet] = useState({}); // New
    const [supplierAging, setSupplierAging] = useState({}); // New

    // Dynamic Data
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);

    // Reports State
    const [activeReport, setActiveReport] = useState('dashboard'); // dashboard, gl, aging, pl, bs, trial
    const [glStats, setGlStats] = useState(null); // Data for GL
    const [reportFilters, setReportFilters] = useState({
        accountId: '',
        startDate: new Date().toISOString().split('T')[0].substring(0, 8) + '01', // First of month
        endDate: new Date().toISOString().split('T')[0]
    });

    // Journal Entry Form
    const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
    const [journalDesc, setJournalDesc] = useState('');
    const [journalDept, setJournalDept] = useState('General');
    const [journalLines, setJournalLines] = useState([{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }]);
    const [journalEntries, setJournalEntries] = useState([]);

    // Revision State
    const [revisingId, setRevisingId] = useState(null);
    const [revisionReason, setRevisionReason] = useState('');
    const [reviseDesc, setReviseDesc] = useState('');

    // Closing Month State
    const [closingYear, setClosingYear] = useState(new Date().getFullYear());
    const [closingMonth, setClosingMonth] = useState(new Date().getMonth()); // Default to previous month (0-11, needs adjustment)
    const [closingPreview, setClosingPreview] = useState(null); // Data for preview
    const [isClosing, setIsClosing] = useState(false);

    // Masters Management State
    const [newDept, setNewDept] = useState('');
    const [newCat, setNewCat] = useState('');

    useEffect(() => {
        fetchDepartments();
        // fetchCategories(); // Maybe not needed if we just use GL Accounts?
        // Actually, P&L report might still rely on expense categories if data came from there.
        // But for future, GL accounts are the categories.
        fetchAccounts();
        fetchJournalEntries();
    }, []);

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchTrialBalance();
            fetchProfitLoss();
            fetchBalanceSheet(); // New
            fetchSupplierAging(); // New
        }
        if (activeTab === 'journal') {
            fetchAccounts();
            fetchJournalEntries();
            fetchDepartments();
            fetchSuppliers(); // Fetch suppliers for the dropdown
        }
        if (activeTab === 'suppliers') {
            fetchSuppliers();
        }
    }, [activeTab]);

    const fetchDepartments = () => fetch('http://localhost:5000/api/accounting/departments').then(r => r.json()).then(setDepartments).catch(console.error);
    // const fetchCategories = () => ...

    // Fetchers
    const fetchBalanceSheet = () => fetch('http://localhost:5000/api/accounting/reports/balance-sheet').then(r => r.json()).then(setBalanceSheet).catch(console.error);
    const fetchSupplierAging = () => fetch('http://localhost:5000/api/accounting/reports/aging').then(r => r.json()).then(setSupplierAging).catch(console.error);

    const fetchJournalEntries = () => {
        fetch('http://localhost:5000/api/accounting/journal/entries')
            .then(res => res.json())
            .then(data => setJournalEntries(data))
            .catch(err => {
                console.error(err);
                if (activeTab === 'journal') alert('Failed to load journal entries');
            });
    };

    const fetchTrialBalance = () => {
        fetch('http://localhost:5000/api/accounting/reports/trial-balance')
            .then(res => res.json())
            .then(data => setTrialBalance(data))
            .catch(err => console.log('API Error'));
    };

    const fetchProfitLoss = () => {
        fetch('http://localhost:5000/api/accounting/reports/profit-loss')
            .then(res => res.json())
            .then(data => setProfitLoss(data))
            .catch(console.error);
    };

    const fetchAccounts = () => {
        // ... (Keep existing fetchAccounts logic)
        fetch('http://localhost:5000/api/accounting/accounts')
            .then(res => res.json())
            .then(data => {
                const flat = [];
                const traverse = (nodes) => {
                    nodes.forEach(n => {
                        flat.push(n);
                        if (n.children) traverse(n.children);
                    });
                }
                traverse(data);
                setAccounts(flat);
            })
            .catch(err => console.log(err));
    };

    // --- SUPPLIERS MANAGEMENT ---
    const [suppliers, setSuppliers] = useState([]);
    const [supplierForm, setSupplierForm] = useState({
        name: '', commercial_record: '', address: '', phone: '', tax_number: '', email: '', nature_of_business: ''
    });

    const fetchSuppliers = () => {
        fetch('http://localhost:5000/api/accounting/suppliers').then(r => r.json()).then(setSuppliers).catch(console.error);
    };

    const handleSupplierSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/accounting/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplierForm)
            });
            if (res.ok) {
                alert('Supplier Created & GL Account Generated');
                setSupplierForm({ name: '', commercial_record: '', address: '', phone: '', tax_number: '', email: '', nature_of_business: '' });
                fetchSuppliers();
                fetchAccounts(); // Update accounts list too
            } else {
                const err = await res.json();
                alert('Error: ' + err.message);
            }
        } catch (e) { alert('Error: ' + e.message); }
    };

    // --- MASTERS MANAGEMENT ---
    const [newAcc, setNewAcc] = useState({ code: '', name: '', type: 'Asset' });

    const handleAddAccount = async () => {
        if (!newAcc.code || !newAcc.name) return alert('Please fill in Code and Name');
        try {
            const res = await fetch('http://localhost:5000/api/accounting/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAcc)
            });
            if (res.ok) {
                alert('Account Created');
                setNewAcc({ code: '', name: '', type: 'Asset' });
                fetchAccounts();
            } else {
                const err = await res.json();
                alert('Error: ' + err.message);
            }
        } catch (e) { alert('Error: ' + e.message); }
    };

    const handleDeleteAccount = async (id) => {
        if (window.confirm('Delete this account? Ensure it has no transactions.')) {
            try {
                const res = await fetch(`http://localhost:5000/api/accounting/accounts/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchAccounts();
                } else {
                    const err = await res.json();
                    alert('Error: ' + err.message);
                }
            } catch (e) { alert('Error: ' + e.message); }
        }
    };

    const addDepartment = async () => {
        if (!newDept) return alert('الرجاء إدخال اسم القسم');
        try {
            const res = await fetch('http://localhost:5000/api/accounting/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDept })
            });
            if (res.ok) {
                alert('تم إضافة القسم بنجاح');
                setNewDept('');
                fetchDepartments();
            } else {
                alert('فشل إضافة القسم');
            }
        } catch (e) { alert('Error: ' + e.message); }
    };

    const deleteDepartment = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            await fetch(`http://localhost:5000/api/accounting/departments/${id}`, { method: 'DELETE' });
            fetchDepartments();
        }
    };

    // Categories removed for GL Mode (Accounts are enough)

    // --- EXPORTS ---
    const exportExcel = () => {
        const wb = XLSX.utils.book_new();

        // P&L Sheet
        if (profitLoss) {
            const plData = [['Department', 'Revenue', 'Expenses', 'Profit']];
            Object.entries(profitLoss).forEach(([dept, data]) => {
                plData.push([dept, data.revenue, data.expenses, data.profit]);
            });
            const wsPL = XLSX.utils.aoa_to_sheet(plData);
            XLSX.utils.book_append_sheet(wb, wsPL, "Profit & Loss");
        }

        // TB Sheet
        if (trialBalance.length > 0) {
            const tbData = [['Code', 'Account', 'Debit', 'Credit', 'Balance']];
            trialBalance.forEach(row => {
                tbData.push([row.code, row.name, row.total_debit, row.total_credit, row.net_balance]);
            });
            const wsTB = XLSX.utils.aoa_to_sheet(tbData);
            XLSX.utils.book_append_sheet(wb, wsTB, "Trial Balance");
        }

        XLSX.writeFile(wb, "Financial_Reports.xlsx");
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.font = "Helvetica"; // Basic font, Arabic support in jsPDF requires custom fonts, using English for now or basic

        doc.text("Financial Report", 14, 20);

        if (Object.keys(profitLoss).length > 0) {
            doc.text("Profit & Loss", 14, 30);
            const rows = Object.entries(profitLoss).map(([dept, data]) => [dept, data.revenue, data.expenses, data.profit]);
            doc.autoTable({
                startY: 35,
                head: [['Department', 'Revenue', 'Expenses', 'Profit']],
                body: rows,
            });
        }

        doc.save("Report.pdf");
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/accounting/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseForm)
            });
            if (res.ok) {
                alert('Saved');
                setExpenseForm({ ...expenseForm, vendor: '', description: '', amount: '' });
                fetchExpenses();
            } else {
                const err = await res.json();
                alert('Error: ' + err.message);
            }
        } catch (err) { console.error(err); }
    };

    // --- PRINTING ---
    const printJournalVoucher = (entry) => {
        const doc = new jsPDF();
        doc.font = "Helvetica"; // Basic font
        doc.setFontSize(18);
        doc.text("Journal Voucher (سند قيد)", 105, 15, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`Date: ${entry.date.split('T')[0]}`, 14, 25);
        // Use Reference Number if available, else "DRAFT"
        const refNo = entry.reference_number || entry.ref || 'DRAFT';
        doc.text(`Entry #: ${refNo}`, 14, 30);
        doc.text(`Description: ${entry.description}`, 14, 35);

        const rows = entry.lines.map(l => {
            // Find account name if not populated (for draft printing)
            let accName = l.account_name;
            if (!accName && l.account_id) {
                const acc = accounts.find(a => a.id == l.account_id);
                accName = acc ? `${acc.code} - ${acc.name}` : '-';
            }
            return [
                accName || 'Account',
                l.description || '-',
                l.department || 'General',
                Number(l.debit || 0).toFixed(2),
                Number(l.credit || 0).toFixed(2)
            ];
        });

        // Add Totals Row
        const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
        const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

        rows.push(['TOTAL', '', '', totalDebit.toFixed(2), totalCredit.toFixed(2)]);

        doc.autoTable({
            startY: 45,
            head: [['Account', 'Description', 'Dept', 'Debit', 'Credit']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            footStyles: { fillColor: [240, 240, 240] },
            columnStyles: {
                0: { cellWidth: 50 }, // Account
                1: { cellWidth: 50 }, // Desc
                2: { cellWidth: 30 }, // Dept
                3: { halign: 'right' },
                4: { halign: 'right' }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 20;

        doc.text("Prepared By: _________________", 14, finalY);
        doc.text("Approved By: _________________", 140, finalY);

        doc.save(`JV-${refNo}.pdf`);
    };

    const submitJournalEntry = async (e) => {
        e.preventDefault();
        try {
            const entryData = {
                date: journalDate,
                description: journalDesc,
                // Department is now line-level, but header department might still be used as default or removed.
                // We'll pass it as null or 'General' if backend expects it, but backend now uses line dept.
                lines: journalLines.filter(row => row.account_id && (Number(row.debit) > 0 || Number(row.credit) > 0))
            };

            const res = await fetch('http://localhost:5000/api/accounting/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entryData)
            });
            if (res.ok) {
                const result = await res.json();
                // result should contain { message, id, reference_number }

                alert('Saved Successfully - Reference: ' + (result.reference_number || ''));

                // Print Voucher with the generated Reference Number
                printJournalVoucher({
                    ...entryData,
                    reference_number: result.reference_number || 'NEW',
                    id: result.id
                });

                // Reset
                setJournalDesc('');
                // setJournalDept('General'); // Removed from header
                setJournalLines([{ account_id: '', debit: 0, credit: 0, department: 'General' }, { account_id: '', debit: 0, credit: 0, department: 'General' }]);
                fetchJournalEntries();
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (err) { console.error(err); }
    };

    // Revision Logic
    const openReviseModal = (entry) => {
        setRevisingId(entry.id);
        setReviseDesc(entry.description);
        setRevisionReason('');
    };

    const submitRevision = async () => {
        if (!revisionReason) return alert('Reason is required');
        try {
            const res = await fetch(`http://localhost:5000/api/accounting/journal/${revisingId}/revise`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: reviseDesc, reason: revisionReason })
            });
            if (res.ok) {
                alert('Revised Successfully');
                setRevisingId(null);
                // fetchEntries(); // refresh
            } else {
                const err = await res.json();
                alert('Error: ' + err.message);
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">الحسابات العامة (Accounting - GL Mode)</h1>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('journal')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'journal' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                        <BookOpen size={18} /> قيود اليومية
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                        <TrendingUp size={18} /> التقارير
                    </button>
                    <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'suppliers' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                        <Users size={18} /> الموردين
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                        <Settings size={18} /> الإعدادات
                    </button>
                    <button onClick={() => setActiveTab('closing')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'closing' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                        <Lock size={18} /> الإقفال (Closing)
                    </button>
                </div>
            </div>

            {/* EXPENSES TAB */}
            {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                        <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2">
                            <Plus size={20} /> تسجيل مصروف جديد
                        </h3>
                        <form onSubmit={handleExpenseSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
                                <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">الجهة / المورد</label>
                                <input type="text" placeholder="Vendor" value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">التصنيف</label>
                                    <select required value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full p-2 border rounded-lg bg-white">
                                        <option value="">اختر...</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الإدارة</label>
                                    <select required value={expenseForm.department} onChange={e => setExpenseForm({ ...expenseForm, department: e.target.value })} className="w-full p-2 border rounded-lg bg-white">
                                        <option value="">اختر...</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">طريقة الدفع</label>
                                <select value={expenseForm.payment_method} onChange={e => setExpenseForm({ ...expenseForm, payment_method: e.target.value })} className="w-full p-2 border rounded-lg bg-white">
                                    <option value="Cash">كاش (Cash)</option>
                                    <option value="Bank">بنك / تحويل (Bank)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ</label>
                                <div className="relative">
                                    <input type="number" required min="0" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full p-2 pr-8 border rounded-lg" />
                                    <DollarSign size={16} className="absolute top-3 right-2 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                                <textarea rows="2" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full p-2 border rounded-lg"></textarea>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">تسجيل المصروف</button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-lg mb-4 text-slate-700">سجل المصروفات (Expenses Log)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">الإدارة</th>
                                        <th className="p-3">التصنيف</th>
                                        <th className="p-3">الجهة</th>
                                        <th className="p-3">الوصف</th>
                                        <th className="p-3">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {expenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-slate-50">
                                            <td className="p-3">{exp.date.split('T')[0]}</td>
                                            <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{exp.department}</span></td>
                                            <td className="p-3">{exp.category}</td>
                                            <td className="p-3">{exp.vendor}</td>
                                            <td className="p-3 text-slate-500 max-w-xs truncate">{exp.description}</td>
                                            <td className="p-3 font-bold text-red-600">-{Number(exp.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    {activeReport === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div onClick={() => setActiveReport('gl')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition">
                                <FileText className="text-blue-600 mb-4" size={32} />
                                <h3 className="font-bold text-lg text-slate-700">كشف حساب (Account Statement)</h3>
                                <p className="text-sm text-slate-500 mt-2">عرض حركة حساب معين بالتفصيل مع الرصيد (GL).</p>
                            </div>
                            <div onClick={() => { fetchSupplierAging(); setActiveReport('aging'); }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition">
                                <Users className="text-orange-600 mb-4" size={32} />
                                <h3 className="font-bold text-lg text-slate-700">أعمار ديون الموردين (Aging)</h3>
                                <p className="text-sm text-slate-500 mt-2">تحليل مستحقات الموردين والفواتير المتأخرة.</p>
                            </div>
                            <div onClick={() => { fetchProfitLoss(); setActiveReport('pl'); }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition">
                                <TrendingUp className="text-green-600 mb-4" size={32} />
                                <h3 className="font-bold text-lg text-slate-700">قائمة الدخل (Profit & Loss)</h3>
                                <p className="text-sm text-slate-500 mt-2">الإيرادات والمصروفات وصافي الربح.</p>
                            </div>
                            <div onClick={() => { fetchBalanceSheet(); setActiveReport('bs'); }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition">
                                <Wallet className="text-purple-600 mb-4" size={32} />
                                <h3 className="font-bold text-lg text-slate-700">الميزانية العمومية (Balance Sheet)</h3>
                                <p className="text-sm text-slate-500 mt-2">الأصول والخصوم وحقوق الملكية.</p>
                            </div>
                            <div onClick={() => setActiveTab('closing')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition">
                                <Lock className="text-amber-600 mb-4" size={32} />
                                <h3 className="font-bold text-lg text-slate-700">إقفال الفترة (Month Closing)</h3>
                                <p className="text-sm text-slate-500 mt-2">إقفال الحسابات وترحيل الأرباح/الخسائر.</p>
                            </div>
                        </div>
                    )}

                    {activeReport !== 'dashboard' && (
                        <button onClick={() => setActiveReport('dashboard')} className="mb-6 text-slate-500 hover:text-blue-600 flex items-center gap-2">
                            &larr; العودة للتقارير (Back to Dashboard)
                        </button>
                    )}

                    {/* GL: ACCOUNT STATEMENT */}
                    {activeReport === 'gl' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex flex-wrap gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium mb-1">اختر الحساب (Account)</label>
                                    <input
                                        list="accounts-ids"
                                        className="w-full p-2 border rounded"
                                        placeholder="بحث بالكود أو الاسم..."
                                        onChange={e => {
                                            const val = e.target.value;
                                            const acc = accounts.find(a => `${a.code} - ${a.name}` === val);
                                            if (acc) setReportFilters({ ...reportFilters, accountId: acc.id });
                                        }}
                                    />
                                    <datalist id="accounts-ids">
                                        {accounts.map(a => <option key={a.id} value={`${a.code} - ${a.name}`} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">من تاريخ</label>
                                    <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })} className="p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
                                    <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })} className="p-2 border rounded" />
                                </div>
                                <button
                                    onClick={() => {
                                        fetch(`http://localhost:5000/api/accounting/reports/account-statement?account_id=${reportFilters.accountId}&start_date=${reportFilters.startDate}&end_date=${reportFilters.endDate}`)
                                            .then(r => r.json())
                                            .then(setGlStats)
                                            .catch(console.error);
                                    }}
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                                >
                                    عرض التقرير
                                </button>
                            </div>

                            {glStats && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <div>
                                            <h3 className="font-bold text-xl">كشف حساب (Statement)</h3>
                                            <p className="text-slate-500">Period: {reportFilters.startDate} to {reportFilters.endDate}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const doc = new jsPDF();
                                                    doc.font = "Helvetica";
                                                    doc.text("Account Statement", 105, 15, { align: 'center' });
                                                    doc.text(`Account: ${accounts.find(a => a.id == reportFilters.accountId)?.name || '-'}`, 14, 25);
                                                    doc.text(`Period: ${reportFilters.startDate} - ${reportFilters.endDate}`, 14, 30);

                                                    const rows = glStats.transactions.map(t => [
                                                        t.date.split('T')[0],
                                                        t.reference_number || '-',
                                                        t.line_desc || t.header_desc,
                                                        Number(t.debit).toFixed(2),
                                                        Number(t.credit).toFixed(2),
                                                        Number(t.running_balance).toFixed(2)
                                                    ]);

                                                    // Add Opening Balance Row
                                                    rows.unshift(['-', '-', 'Opening Balance', '-', '-', Number(glStats.opening_balance).toFixed(2)]);

                                                    doc.autoTable({
                                                        startY: 40,
                                                        head: [['Date', 'Ref', 'Description', 'Debit', 'Credit', 'Balance']],
                                                        body: rows,
                                                        theme: 'grid'
                                                    });
                                                    doc.save('Account_Statement.pdf');
                                                }}
                                                className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-100 hover:bg-red-100 flex items-center gap-2"
                                            >
                                                <FileText size={18} /> Export PDF
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const ws = XLSX.utils.json_to_sheet(glStats.transactions.map(t => ({
                                                        Date: t.date.split('T')[0],
                                                        Ref: t.reference_number,
                                                        Desc: t.line_desc || t.header_desc,
                                                        Debit: t.debit,
                                                        Credit: t.credit,
                                                        Balance: t.running_balance
                                                    })));
                                                    const wb = XLSX.utils.book_new();
                                                    XLSX.utils.book_append_sheet(wb, ws, "Statement");
                                                    XLSX.writeFile(wb, "Account_Statement.xlsx");
                                                }}
                                                className="bg-green-50 text-green-600 px-4 py-2 rounded border border-green-100 hover:bg-green-100 flex items-center gap-2"
                                            >
                                                <DollarSign size={18} /> Export Excel
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-slate-50 p-4 rounded text-center">
                                            <span className="block text-slate-500 text-sm">Opening Balance</span>
                                            <span className="font-bold text-lg">{Number(glStats.opening_balance).toFixed(2)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded text-center">
                                            <span className="block text-slate-500 text-sm">Net Change</span>
                                            <span className="font-bold text-lg">{(Number(glStats.closing_balance) - Number(glStats.opening_balance)).toFixed(2)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded text-center border-t-2 border-blue-500">
                                            <span className="block text-slate-500 text-sm">Closing Balance</span>
                                            <span className="font-bold text-lg text-blue-600">{Number(glStats.closing_balance).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Ref</th>
                                                <th className="p-3">Description</th>
                                                <th className="p-3">Debit</th>
                                                <th className="p-3">Credit</th>
                                                <th className="p-3">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr className="bg-yellow-50 font-medium">
                                                <td colSpan="3" className="p-3">رصيد افتتاحي (Opening Balance)</td>
                                                <td className="p-3">-</td>
                                                <td className="p-3">-</td>
                                                <td className="p-3">{Number(glStats.opening_balance).toFixed(2)}</td>
                                            </tr>
                                            {glStats.transactions.length === 0 && (
                                                <tr><td colSpan="6" className="p-6 text-center text-slate-500">No transactions in this period</td></tr>
                                            )}
                                            {glStats.transactions.map((t, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-3">{t.date.split('T')[0]}</td>
                                                    <td className="p-3 font-mono">{t.reference_number}</td>
                                                    <td className="p-3">{t.line_desc || t.header_desc}</td>
                                                    <td className="p-3 text-slate-500">{Number(t.debit) > 0 ? Number(t.debit).toFixed(2) : '-'}</td>
                                                    <td className="p-3 text-slate-500">{Number(t.credit) > 0 ? Number(t.credit).toFixed(2) : '-'}</td>
                                                    <td className="p-3 font-bold">{Number(t.running_balance).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-blue-50 font-bold border-t-2 border-slate-300">
                                                <td colSpan="3" className="p-3">رصيد ختامي (Closing Balance)</td>
                                                <td className="p-3 text-blue-600">{glStats.transactions.reduce((s, t) => s + Number(t.debit), 0).toFixed(2)}</td>
                                                <td className="p-3 text-blue-600">{glStats.transactions.reduce((s, t) => s + Number(t.credit), 0).toFixed(2)}</td>
                                                <td className="p-3 text-blue-700 text-lg">{Number(glStats.closing_balance).toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PROFIT & LOSS */}
                    {activeReport === 'pl' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between mb-6">
                                <h3 className="font-bold text-lg">Profit & Loss Statement (قائمة الدخل)</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const doc = new jsPDF();
                                            doc.text("Profit & Loss Statement", 105, 15, { align: 'center' });

                                            const rows = Object.entries(profitLoss).map(([dept, data]) => [
                                                dept,
                                                data.revenue.toLocaleString(),
                                                data.expenses.toLocaleString(),
                                                data.profit.toLocaleString()
                                            ]);

                                            // Add Total Row
                                            const totalRev = Object.values(profitLoss).reduce((a, c) => a + c.revenue, 0);
                                            const totalExp = Object.values(profitLoss).reduce((a, c) => a + c.expenses, 0);
                                            const totalNet = Object.values(profitLoss).reduce((a, c) => a + c.profit, 0);
                                            rows.push(['TOTAL', totalRev.toLocaleString(), totalExp.toLocaleString(), totalNet.toLocaleString()]);

                                            doc.autoTable({
                                                head: [['Department', 'Revenue', 'Expenses', 'Net Profit']],
                                                body: rows,
                                                startY: 25,
                                                theme: 'grid',
                                                headStyles: { fillColor: [41, 128, 185] }
                                            });
                                            doc.save('Profit_Loss.pdf');
                                        }}
                                        className="text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-sm flex items-center gap-1"
                                    >
                                        <FileText size={16} /> PDF
                                    </button>
                                    <button
                                        onClick={() => {
                                            const data = Object.entries(profitLoss).map(([dept, d]) => ({
                                                Department: dept,
                                                Revenue: d.revenue,
                                                Expenses: d.expenses,
                                                Net_Profit: d.profit
                                            }));
                                            // Add distinct total row object
                                            const totalRev = Object.values(profitLoss).reduce((a, c) => a + c.revenue, 0);
                                            const totalExp = Object.values(profitLoss).reduce((a, c) => a + c.expenses, 0);
                                            const totalNet = Object.values(profitLoss).reduce((a, c) => a + c.profit, 0);
                                            data.push({ Department: 'TOTAL', Revenue: totalRev, Expenses: totalExp, Net_Profit: totalNet });

                                            const ws = XLSX.utils.json_to_sheet(data);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
                                            XLSX.writeFile(wb, "Profit_Loss.xlsx");
                                        }}
                                        className="text-green-600 border border-green-200 px-3 py-1 rounded hover:bg-green-50 text-sm flex items-center gap-1"
                                    >
                                        <DollarSign size={16} /> Excel
                                    </button>
                                </div>
                            </div>

                            <table id="pl-table" className="w-full text-right text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3">Department / Category</th>
                                        <th className="p-3 text-green-700">Revenue (إيرادات)</th>
                                        <th className="p-3 text-red-700">Expenses (مصروفات)</th>
                                        <th className="p-3">Net Profit (صافي الربح)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(profitLoss).map(([dept, data]) => (
                                        <tr key={dept} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium">{dept}</td>
                                            <td className="p-3 text-green-600">{data.revenue.toLocaleString()}</td>
                                            <td className="p-3 text-red-600">{data.expenses.toLocaleString()}</td>
                                            <td className={`p-3 font-bold ${data.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                {data.profit.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-100 font-bold text-base">
                                        <td className="p-3">Total</td>
                                        <td className="p-3 text-green-800">
                                            {Object.values(profitLoss).reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()} SAR
                                        </td>
                                        <td className="p-3 text-red-800">
                                            {Object.values(profitLoss).reduce((acc, curr) => acc + curr.expenses, 0).toLocaleString()} SAR
                                        </td>
                                        <td className="p-3 text-blue-800">
                                            {Object.values(profitLoss).reduce((acc, curr) => acc + curr.profit, 0).toLocaleString()} SAR
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* BALANCE SHEET */}
                    {activeReport === 'bs' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between mb-6">
                                <h3 className="font-bold text-lg">الميزانية العمومية (Balance Sheet)</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const doc = new jsPDF();
                                            doc.text("Balance Sheet", 105, 15, { align: 'center' });

                                            const rows = [];
                                            // Assets Section
                                            rows.push([{ content: 'ASSETS', colSpan: 3, styles: { fillColor: [220, 255, 220], fontStyle: 'bold' } }]);
                                            (balanceSheet.assets || []).forEach(a => rows.push([a.code, a.name, Number(a.balance).toLocaleString()]));
                                            rows.push([{ content: `TOTAL ASSETS: ${Number(balanceSheet.total_assets || 0).toLocaleString()}`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }]);

                                            // Liabilities Section
                                            rows.push([{ content: 'LIABILITIES', colSpan: 3, styles: { fillColor: [255, 220, 220], fontStyle: 'bold' } }]);
                                            (balanceSheet.liabilities || []).forEach(l => rows.push([l.code, l.name, Number(Math.abs(l.balance)).toLocaleString()]));
                                            rows.push([{ content: `TOTAL LIABILITIES: ${Number(balanceSheet.total_liabilities || 0).toLocaleString()}`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }]);

                                            // Equity Section
                                            rows.push([{ content: 'EQUITY', colSpan: 3, styles: { fillColor: [240, 220, 255], fontStyle: 'bold' } }]);
                                            (balanceSheet.equity || []).forEach(e => rows.push([e.code, e.name, Number(Math.abs(e.balance)).toLocaleString()]));
                                            rows.push(['-', 'Net Profit (Current)', Number(balanceSheet.net_profit || 0).toLocaleString()]);
                                            rows.push([{ content: `TOTAL EQUITY: ${Number(balanceSheet.total_equity || 0).toLocaleString()}`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }]);

                                            doc.autoTable({
                                                head: [['Code', 'Account', 'Amount']],
                                                body: rows,
                                                startY: 25,
                                                theme: 'grid',
                                                columnStyles: { 2: { halign: 'right' } }
                                            });
                                            doc.save('Balance_Sheet.pdf');
                                        }}
                                        className="text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-sm flex items-center gap-1"
                                    >
                                        <FileText size={16} /> PDF
                                    </button>
                                    <button
                                        onClick={() => {
                                            const data = [];
                                            data.push({ Category: 'ASSETS', Code: '', Account: '', Amount: '' });
                                            (balanceSheet.assets || []).forEach(a => data.push({ Category: 'Asset', Code: a.code, Account: a.name, Amount: Number(a.balance) }));
                                            data.push({ Category: 'Total Assets', Code: '', Account: '', Amount: Number(balanceSheet.total_assets || 0) });

                                            data.push({ Category: '', Code: '', Account: '', Amount: '' }); // Spacer

                                            data.push({ Category: 'LIABILITIES', Code: '', Account: '', Amount: '' });
                                            (balanceSheet.liabilities || []).forEach(l => data.push({ Category: 'Liability', Code: l.code, Account: l.name, Amount: Number(Math.abs(l.balance)) }));
                                            data.push({ Category: 'Total Liabilities', Code: '', Account: '', Amount: Number(balanceSheet.total_liabilities || 0) });

                                            data.push({ Category: '', Code: '', Account: '', Amount: '' }); // Spacer

                                            data.push({ Category: 'EQUITY', Code: '', Account: '', Amount: '' });
                                            (balanceSheet.equity || []).forEach(e => data.push({ Category: 'Equity', Code: e.code, Account: e.name, Amount: Number(Math.abs(e.balance)) }));
                                            data.push({ Category: 'Equity', Code: '-', Account: 'Net Profit (Current)', Amount: Number(balanceSheet.net_profit || 0) });
                                            data.push({ Category: 'Total Equity', Code: '', Account: '', Amount: Number(balanceSheet.total_equity || 0) });

                                            const ws = XLSX.utils.json_to_sheet(data);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
                                            XLSX.writeFile(wb, "Balance_Sheet.xlsx");
                                        }}
                                        className="text-green-600 border border-green-200 px-3 py-1 rounded hover:bg-green-50 text-sm flex items-center gap-1"
                                    >
                                        <DollarSign size={16} /> Excel
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Assets */}
                                <div>
                                    <h4 className="font-bold text-green-700 border-b pb-2 mb-4 flex justify-between">
                                        <span>الأصول (Assets)</span>
                                        <span>{Number(balanceSheet.total_assets || 0).toLocaleString()}</span>
                                    </h4>
                                    <ul className="space-y-2 text-sm">
                                        {balanceSheet.assets?.map(a => (
                                            <li key={a.id} className="flex justify-between p-2 bg-slate-50 rounded">
                                                <span><span className="font-mono font-bold text-slate-500 mr-2">{a.code}</span> {a.name}</span>
                                                <span className="font-mono">{Number(a.balance).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Liabilities & Equity */}
                                <div>
                                    <h4 className="font-bold text-red-700 border-b pb-2 mb-4 flex justify-between">
                                        <span>الخصوم (Liabilities)</span>
                                        <span>{Number(balanceSheet.total_liabilities || 0).toLocaleString()}</span>
                                    </h4>
                                    <ul className="space-y-2 text-sm mb-8">
                                        {balanceSheet.liabilities?.map(a => (
                                            <li key={a.id} className="flex justify-between p-2 bg-slate-50 rounded">
                                                <span><span className="font-mono font-bold text-slate-500 mr-2">{a.code}</span> {a.name}</span>
                                                <span className="font-mono">{Number(Math.abs(a.balance)).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <h4 className="font-bold text-purple-700 border-b pb-2 mb-4 flex justify-between">
                                        <span>حقوق الملكية (Equity)</span>
                                        <span>{Number(balanceSheet.total_equity || 0).toLocaleString()}</span>
                                    </h4>
                                    <ul className="space-y-2 text-sm">
                                        {balanceSheet.equity?.map(a => (
                                            <li key={a.id || a.code} className="flex justify-between p-2 bg-slate-50 rounded">
                                                <span><span className="font-mono font-bold text-slate-500 mr-2">{a.code}</span> {a.name}</span>
                                                <span className="font-mono">{Number(Math.abs(a.balance)).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AGING */}
                    {activeReport === 'aging' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between mb-6">
                                <h3 className="font-bold text-lg">أعمار ديون الموردين (Supplier Aging)</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const doc = new jsPDF();
                                            doc.text("Supplier Aging Report", 105, 15, { align: 'center' });

                                            const rows = Object.entries(supplierAging).map(([name, data]) => [
                                                name,
                                                data.total.toLocaleString(),
                                                data['0-30'].toLocaleString(),
                                                data['31-60'].toLocaleString(),
                                                data['61-90'].toLocaleString(),
                                                data['90+'].toLocaleString()
                                            ]);

                                            doc.autoTable({
                                                head: [['Supplier', 'Total Due', '0-30', '31-60', '61-90', '90+']],
                                                body: rows,
                                                startY: 25,
                                                theme: 'grid',
                                                headStyles: { fillColor: [231, 76, 60] }
                                            });
                                            doc.save('Supplier_Aging.pdf');
                                        }}
                                        className="text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-sm flex items-center gap-1"
                                    >
                                        <FileText size={16} /> PDF
                                    </button>
                                    <button
                                        onClick={() => {
                                            const data = Object.entries(supplierAging).map(([name, d]) => ({
                                                Supplier: name,
                                                Total_Due: d.total,
                                                '0-30 Days': d['0-30'],
                                                '31-60 Days': d['31-60'],
                                                '61-90 Days': d['61-90'],
                                                '90+ Days': d['90+']
                                            }));
                                            const ws = XLSX.utils.json_to_sheet(data);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Aging");
                                            XLSX.writeFile(wb, "Supplier_Aging.xlsx");
                                        }}
                                        className="text-green-600 border border-green-200 px-3 py-1 rounded hover:bg-green-50 text-sm flex items-center gap-1"
                                    >
                                        <DollarSign size={16} /> Excel
                                    </button>
                                </div>
                            </div>
                            <table id="aging-table" className="w-full text-right text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-3">المورد (Supplier)</th>
                                        <th className="p-3">الإجمالي (Total Due)</th>
                                        <th className="p-3 text-green-600">Current (0-30)</th>
                                        <th className="p-3 text-amber-600">31-60 Days</th>
                                        <th className="p-3 text-orange-600">61-90 Days</th>
                                        <th className="p-3 text-red-600">90+ Days</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(supplierAging).map(([name, data]) => (
                                        <tr key={name} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium">{name}</td>
                                            <td className="p-3 font-bold">{data.total.toLocaleString()}</td>
                                            <td className="p-3">{data['0-30'].toLocaleString()}</td>
                                            <td className="p-3">{data['31-60'].toLocaleString()}</td>
                                            <td className="p-3">{data['61-90'].toLocaleString()}</td>
                                            <td className="p-3 text-red-600 font-bold">{data['90+'].toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* JOURNAL TAB */}
            {activeTab === 'journal' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                                <BookOpen size={20} /> تسجيل قيد يومية (Journal Entry)
                            </h3>
                            <button
                                type="button"
                                onClick={() => printJournalVoucher({
                                    date: journalDate,
                                    description: journalDesc,
                                    reference_number: 'DRAFT',
                                    lines: journalLines
                                })}
                                className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                            >
                                <Download size={16} /> معاينة الطباعة
                            </button>
                        </div>

                        <form onSubmit={submitJournalEntry} className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
                                    <input type="date" required value={journalDate} onChange={e => setJournalDate(e.target.value)} className="w-full p-2 border rounded-lg bg-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">شرح القيد (Main Description)</label>
                                    <input type="text" required value={journalDesc} onChange={e => setJournalDesc(e.target.value)} placeholder="مثال: تسوية عهدة موظف" className="w-full p-2 border rounded-lg bg-white" />
                                </div>
                            </div>

                            {/* Lines Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-100 text-slate-700 font-bold">
                                        <tr>
                                            <th className="p-3 w-1/4">الحساب (Account)</th>
                                            <th className="p-3 w-1/4">البيان (Description)</th>
                                            <th className="p-3 w-1/6">الجهة / مركز التكلفة (Entity/Center)</th>
                                            <th className="p-3 w-20">مدين</th>
                                            <th className="p-3 w-20">دائن</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {journalLines.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2">
                                                    <input
                                                        list="accounts-list"
                                                        placeholder="ابحث بالكود أو الاسم..."
                                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                                        value={row.searchDetails || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const acc = accounts.find(a => `${a.code} - ${a.name}` === val || a.code === val || a.name === val);
                                                            const newLines = [...journalLines];
                                                            newLines[idx].searchDetails = val;
                                                            if (acc) newLines[idx].account_id = acc.id;
                                                            else newLines[idx].account_id = '';
                                                            setJournalLines(newLines);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        placeholder="شرح..."
                                                        className="w-full p-2 border rounded"
                                                        value={row.description || ''}
                                                        onChange={e => {
                                                            const newLines = [...journalLines];
                                                            newLines[idx].description = e.target.value;
                                                            setJournalLines(newLines);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <select
                                                        className="w-full p-2 border rounded text-xs"
                                                        value={row.department || 'General'}
                                                        onChange={e => {
                                                            const newLines = [...journalLines];
                                                            newLines[idx].department = e.target.value;
                                                            setJournalLines(newLines);
                                                        }}
                                                    >
                                                        <optgroup label="General">
                                                            <option value="General">General</option>
                                                            <option value="Admin">Admin (إداري)</option>
                                                            <option value="Marketing">Marketing (تسويق)</option>
                                                        </optgroup>
                                                        <optgroup label="Departments">
                                                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                                        </optgroup>
                                                        <optgroup label="Financials">
                                                            <option value="Asset">Asset (أصل)</option>
                                                            <option value="Liability">Liability (التزام)</option>
                                                            <option value="Equity">Equity (ملكية)</option>
                                                        </optgroup>
                                                        <optgroup label="Suppliers">
                                                            {suppliers.map(s => <option key={s.id} value={`Supplier: ${s.name}`}>{s.name}</option>)}
                                                        </optgroup>
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" step="0.01" min="0" className="w-full p-2 border rounded font-mono"
                                                        value={row.debit}
                                                        onChange={e => {
                                                            const newLines = [...journalLines];
                                                            newLines[idx].debit = e.target.value;
                                                            newLines[idx].credit = 0;
                                                            setJournalLines(newLines);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" step="0.01" min="0" className="w-full p-2 border rounded font-mono"
                                                        value={row.credit}
                                                        onChange={e => {
                                                            const newLines = [...journalLines];
                                                            newLines[idx].credit = e.target.value;
                                                            newLines[idx].debit = 0;
                                                            setJournalLines(newLines);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={() => {
                                                        const newLines = journalLines.filter((_, i) => i !== idx);
                                                        setJournalLines(newLines);
                                                    }} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold text-slate-700">
                                        <tr>
                                            <td colSpan="3" className="p-3 text-left">
                                                <button type="button" onClick={() => setJournalLines([...journalLines, { account_id: '', debit: 0, credit: 0, department: 'General' }])} className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                                                    <Plus size={16} /> إضافة سطر جديد
                                                </button>
                                            </td>
                                            <td className="p-3 text-green-700 font-mono">
                                                {journalLines.reduce((s, l) => s + Number(l.debit || 0), 0).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-red-700 font-mono">
                                                {journalLines.reduce((s, l) => s + Number(l.credit || 0), 0).toFixed(2)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <datalist id="accounts-list">
                                {accounts.map(acc => (
                                    <option key={acc.id} value={`${acc.code} - ${acc.name}`} />
                                ))}
                            </datalist>

                            {/* Footer Actions */}
                            <div className="flex justify-between items-center bg-slate-100 p-4 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm">
                                        <span className="text-slate-500 ml-2">الفرق:</span>
                                        <span className={`font-bold font-mono text-lg ${Math.abs(journalLines.reduce((s, l) => s + Number(l.debit), 0) - journalLines.reduce((s, l) => s + Number(l.credit), 0)) < 0.01
                                            ? "text-green-600" : "text-red-600"
                                            }`}>
                                            {Math.abs(journalLines.reduce((s, l) => s + Number(l.debit), 0) - journalLines.reduce((s, l) => s + Number(l.credit), 0)).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Auto Balance Button */}
                                    {Math.abs(journalLines.reduce((s, l) => s + Number(l.debit), 0) - journalLines.reduce((s, l) => s + Number(l.credit), 0)) > 0.01 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const totalDebit = journalLines.reduce((s, l) => s + Number(l.debit || 0), 0);
                                                const totalCredit = journalLines.reduce((s, l) => s + Number(l.credit || 0), 0);
                                                const diff = totalDebit - totalCredit;

                                                // Add a new line to balance
                                                const newLine = { account_id: '', debit: 0, credit: 0 };
                                                if (diff > 0) newLine.credit = diff; // Need credit to balance
                                                else newLine.debit = Math.abs(diff); // Need debit to balance

                                                setJournalLines([...journalLines, newLine]);
                                            }}
                                            className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-200"
                                        >
                                            ✨ وزن القيد (Auto-Balance)
                                        </button>
                                    )}
                                </div>

                                <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 flex items-center gap-2">
                                    <Save size={18} /> حفظ وترحيل
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* RECENT JOURNAL ENTRIES */}
                    <div className="mt-8 border-t pt-6">
                        <h4 className="font-bold text-lg mb-4 text-slate-700">سجل القيود (Journal Entries Log)</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="p-3">Ref</th>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">الوصف</th>
                                        <th className="p-3">سبب التعديل</th>
                                        <th className="p-3">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {journalEntries.map(entry => (
                                        <tr key={entry.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs text-slate-500">{entry.reference_number}</td>
                                            <td className="p-3">{entry.date.split('T')[0]}</td>
                                            <td className="p-3">{entry.description}</td>
                                            <td className="p-3 text-amber-600 italic text-xs">{entry.revision_reason || '-'}</td>
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => printJournalVoucher(entry)} className="text-slate-500 hover:text-blue-600" title="Print Voucher">
                                                    <Download size={16} />
                                                </button>
                                                <button onClick={() => openReviseModal(entry)} className="text-blue-600 hover:underline flex items-center gap-1">
                                                    <Edit3 size={16} /> تعديل
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SUPPLIERS TAB */}
            {
                activeTab === 'suppliers' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Add Supplier Form */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                            <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2">
                                <Plus size={20} /> إضافة مورد جديد
                            </h3>
                            <form onSubmit={handleSupplierSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم المورد (Company Name)</label>
                                    <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">طبيعة النشاط (Nature of Business)</label>
                                    <input type="text" value={supplierForm.nature_of_business} onChange={e => setSupplierForm({ ...supplierForm, nature_of_business: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="e.g. Medical Supplies" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">السجل التجاري (CR)</label>
                                        <input type="text" value={supplierForm.commercial_record} onChange={e => setSupplierForm({ ...supplierForm, commercial_record: e.target.value })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">الرقم الضريبي (Tax No)</label>
                                        <input type="text" value={supplierForm.tax_number} onChange={e => setSupplierForm({ ...supplierForm, tax_number: e.target.value })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (Address)</label>
                                    <textarea rows="2" value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} className="w-full p-2 border rounded-lg"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف (Phone)</label>
                                        <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">حفظ المورد (Create)</button>
                            </form>
                        </div>

                        {/* Suppliers List */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-lg mb-4 text-slate-700">قائمة الموردين (Suppliers List)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="p-3">الكود (GL Code)</th>
                                            <th className="p-3">اسم المورد</th>
                                            <th className="p-3">النشاط</th>
                                            <th className="p-3">الرقم الضريبي</th>
                                            <th className="p-3">الهاتف</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {suppliers.map(sup => (
                                            <tr key={sup.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono font-bold text-blue-600">{sup.account_code || '-'}</td>
                                                <td className="p-3 font-medium">{sup.name}</td>
                                                <td className="p-3 text-slate-500">{sup.nature_of_business}</td>
                                                <td className="p-3 font-mono">{sup.tax_number}</td>
                                                <td className="p-3">{sup.phone}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                activeTab === 'settings' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Departments */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-lg mb-4 text-slate-700">الأقسام / التكاليف (Departments)</h3>
                            <p className="text-sm text-slate-500 mb-4">هذه الأقسام تستخدم في توزيع مراكز التكلفة في القيود.</p>
                            <div className="flex gap-2 mb-4">
                                <input type="text" placeholder="اسم القسم" value={newDept} onChange={e => setNewDept(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                                <button onClick={addDepartment} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={20} /></button>
                            </div>
                            <ul className="space-y-2">
                                {departments.map(d => (
                                    <li key={d.id} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                        <span>{d.name}</span>
                                        <button onClick={() => deleteDepartment(d.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Chart of Accounts Manager */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 md:col-span-2">
                            <h3 className="font-bold text-lg mb-4 text-slate-700">دليل الحسابات (Chart of Accounts)</h3>
                            <p className="text-sm text-slate-500 mb-4">You can add new accounts here (e.g. specific Suppliers, Assets). Code must be unique.</p>

                            <div className="flex flex-wrap gap-2 mb-6 bg-slate-50 p-4 rounded-lg">
                                <input
                                    type="text" placeholder="Code (e.g. 20101)"
                                    value={newAcc.code}
                                    onChange={e => setNewAcc({ ...newAcc, code: e.target.value })}
                                    className="w-32 p-2 border rounded-lg"
                                />
                                <input
                                    type="text" placeholder="Account Name"
                                    value={newAcc.name}
                                    onChange={e => setNewAcc({ ...newAcc, name: e.target.value })}
                                    className="flex-1 p-2 border rounded-lg"
                                />
                                <select
                                    value={newAcc.type}
                                    onChange={e => setNewAcc({ ...newAcc, type: e.target.value })}
                                    className="p-2 border rounded-lg"
                                >
                                    <option value="Asset">Asset (أصول)</option>
                                    <option value="Liability">Liability (خصوم)</option>
                                    <option value="Equity">Equity (ملكية)</option>
                                    <option value="Revenue">Revenue (إيراد)</option>
                                    <option value="Expense">Expense (مصروف)</option>
                                </select>
                                <button onClick={handleAddAccount} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                                    <Plus size={18} /> إضافة
                                </button>
                            </div>

                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                        <tr>
                                            <th className="p-3">Code</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {accounts.map(acc => (
                                            <tr key={acc.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono text-slate-500">{acc.code}</td>
                                                <td className="p-3 font-medium">{acc.name}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${acc.type === 'Asset' ? 'bg-blue-100 text-blue-800' :
                                                        acc.type === 'Liability' ? 'bg-red-100 text-red-800' :
                                                            acc.type === 'Equity' ? 'bg-purple-100 text-purple-800' :
                                                                acc.type === 'Revenue' ? 'bg-green-100 text-green-800' :
                                                                    'bg-orange-100 text-orange-800'
                                                        }`}>
                                                        {acc.type}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="text-red-500 hover:text-red-700" title="Delete Account">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                    </div>
                )
            }

            {/* CLOSING / MANAGEMENT TAB */}
            {activeTab === 'closing' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2">
                        <Lock size={20} className="text-amber-600" />
                        إقفال الفترة المالية (Closing & Management)
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Use this to close the books for a specific month. This will zero out Revenue and Expense accounts and transfer the Net Profit/Loss to Retained Earnings.
                    </p>

                    <div className="flex gap-4 items-end mb-6 bg-slate-50 p-4 rounded-lg max-w-2xl">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                            <input
                                type="number"
                                value={closingYear}
                                onChange={e => setClosingYear(Number(e.target.value))}
                                className="p-2 border rounded-lg w-24 text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                            <select
                                value={closingMonth}
                                onChange={e => setClosingMonth(Number(e.target.value))}
                                className="p-2 border rounded-lg w-32"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })} ({i + 1})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                fetch(`http://localhost:5000/api/accounting/close-month-preview?year=${closingYear}&month=${closingMonth}`)
                                    .then(res => res.json())
                                    .then(data => {
                                        if (data.error) alert(data.error);
                                        else setClosingPreview(data);
                                    })
                                    .catch(err => {
                                        console.error(err);
                                        alert('Connection Error: Is the backend server running?');
                                    });
                            }}
                            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 font-medium"
                        >
                            عرض بيانات الإقفال (Preview)
                        </button>
                    </div>

                    {/* Preview Result */}
                    {closingPreview && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                                <h4 className="font-bold text-slate-700">نتائج الإقفال المتوقعة لشهر: {new Date(0, closingMonth - 1).toLocaleString('default', { month: 'long' })} {closingYear}</h4>
                                <button
                                    onClick={() => setClosingPreview(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-green-600 mb-1">إجمالي الإيرادات (Revenue)</p>
                                    <p className="text-xl font-bold text-green-800">{Number(closingPreview.totalRevenue).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <p className="text-sm text-red-600 mb-1">إجمالي المصروفات (Expenses)</p>
                                    <p className="text-xl font-bold text-red-800">{Number(closingPreview.totalExpenses).toLocaleString()}</p>
                                </div>
                                <div className={`p-4 rounded-lg ${closingPreview.netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                                    <p className={`text-sm mb-1 ${closingPreview.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>صافي الربح/الخسارة (Net)</p>
                                    <p className={`text-xl font-bold ${closingPreview.netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                                        {Number(closingPreview.netProfit).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">Will be transferred to Retained Earnings (303)</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('هل أنت متأكد من إقفال هذا الشهر؟ لا يمكن التراجع عن هذه العملية بسهولة.')) return;
                                        setIsClosing(true);
                                        try {
                                            const res = await fetch('http://localhost:5000/api/accounting/close-month', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ year: closingYear, month: closingMonth })
                                            });
                                            const result = await res.json();
                                            if (res.ok) {
                                                alert('تم إقفال الشهر بنجاح! رقم القيد: ' + result.journal_id);
                                                setClosingPreview(null);
                                                fetchJournalEntries(); // Refresh entries
                                            } else {
                                                alert('Error: ' + result.error);
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert('Execution Error: ' + err.message);
                                        } finally {
                                            setIsClosing(false);
                                        }
                                    }}
                                    disabled={isClosing}
                                    className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-200 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Lock size={18} /> تأكيد وإغلاق الشهر (Confirm Closing)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Closing History */}
                    <div className="mt-8 border-t pt-6">
                        <h4 className="font-bold text-sm mb-4 text-slate-700">سجل الإقفالات السابقة (Closing History)</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="p-3">Ref</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {journalEntries.filter(e => e.reference_number?.startsWith('CLOSE-')).map(entry => (
                                        <tr key={entry.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs text-slate-500">{entry.reference_number}</td>
                                            <td className="p-3">{entry.date.split('T')[0]}</td>
                                            <td className="p-3">{entry.description}</td>
                                            <td className="p-3">
                                                <button onClick={() => printJournalVoucher(entry)} className="text-slate-500 hover:text-blue-600" title="Print Voucher">
                                                    <Download size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {journalEntries.filter(e => e.reference_number?.startsWith('CLOSE-')).length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="p-4 text-center text-slate-400 italic">No closing entries found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Revision Modal */}
            {
                revisingId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl w-full max-w-md">
                            <h3 className="font-bold text-lg mb-4">تعديل القيد (Revise Entry)</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-1">الوصف الجديد</label>
                                    <input type="text" value={reviseDesc} onChange={e => setReviseDesc(e.target.value)} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">سبب التعديل (Required)</label>
                                    <textarea value={revisionReason} onChange={e => setRevisionReason(e.target.value)} className="w-full p-2 border rounded" required></textarea>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setRevisingId(null)} className="px-4 py-2 text-slate-600">إلغاء</button>
                                    <button onClick={submitRevision} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ التعديلات</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Accounting;
