import React, { useState, useEffect } from 'react';
import {
    Printer,
    Calendar,
    DollarSign,
    CreditCard,
    FileText,
    ArrowRight,
    Search,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CashReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState({
        summary: [],
        details: [],
        cashier: '',
        date: ''
    });

    useEffect(() => {
        fetchReport();
    }, [reportDate]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/reports/cash-report?date=${reportDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (err) {
            console.error('Error fetching cash report:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const totalCollection = data.summary.reduce((acc, curr) => acc + parseFloat(curr.total_cash), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header - Hidden on Print */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ChevronRight size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">تقرير إغلاق الكاشير</h1>
                        <p className="text-slate-500">مراجعة التحصيل اليومي وإغلاق الوردية</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                        <Calendar size={18} className="text-slate-500 mr-2" />
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700"
                        />
                    </div>

                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                    >
                        <Printer size={18} />
                        <span>طباعة التقرير</span>
                    </button>
                </div>
            </div>

            {/* Print Only Header */}
            <div className="hidden print:block text-center border-b-2 border-slate-800 pb-6 mb-8">
                <h1 className="text-3xl font-bold mb-2">المركز الطبي التخصصي</h1>
                <h2 className="text-xl font-bold text-slate-700">تقرير تحصيل الكاشير اليومي</h2>
                <div className="flex justify-between mt-6 text-sm">
                    <p>التاريخ: {data.date}</p>
                    <p>الكاشير: {data.cashier}</p>
                    <p>وقت الطباعة: {new Date().toLocaleString('ar-EG')}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg shadow-slate-900/10">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-slate-400 font-medium">إجمالي التحصيل</p>
                        <div className="p-2 bg-slate-700 rounded-lg">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold">{totalCollection.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div>
                    <p className="text-xs text-slate-400 mt-2">عدد الفواتير: {data.details.length}</p>
                </div>

                {data.summary.map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-slate-500 font-medium">{item.payment_method === 'cash' ? 'تحصيل نقدي' : item.payment_method === 'visa' ? 'تحصيل فيزا' : 'طرق أخرى'}</p>
                            <div className={`p-2 rounded-lg ${item.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {item.payment_method === 'cash' ? <DollarSign size={20} /> : <CreditCard size={20} />}
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{parseFloat(item.total_cash).toLocaleString()} <span className="text-sm font-normal text-slate-500">ج.م</span></div>
                        <p className="text-xs text-slate-400 mt-2">عدد الفواتير: {item.total_invoices}</p>
                    </div>
                ))}
            </div>

            {/* Details Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center print:hidden">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" />
                        تفاصيل العمليات
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">رقم الفاتورة</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">المبلغ</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">طريقة الدفع</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">الوقت</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">كود المريض</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.details.length > 0 ? (
                                data.details.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">#{row.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{parseFloat(row.final_amount).toLocaleString()} ج.م</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {row.payment_method === 'cash' ? 'نقد' : 'فيزا'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(row.paid_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-blue-600 font-medium">P-{row.patient_id.slice(0, 6)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        لا توجد عمليات مسجلة لهذا اليوم
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Signatures - Print Only */}
            <div className="hidden print:grid grid-cols-2 gap-12 mt-12 text-center">
                <div className="border-t border-slate-400 pt-4">
                    <p className="font-bold">توقيع الكاشير</p>
                    <p className="mt-8 text-slate-600">{data.cashier}</p>
                </div>
                <div className="border-t border-slate-400 pt-4">
                    <p className="font-bold">توقيع المدير المالي</p>
                    <div className="mt-8 h-8"></div>
                </div>
            </div>
        </div>
    );
};

export default CashReport;
