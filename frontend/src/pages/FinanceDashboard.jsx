import API_BASE_URL from '../api';
import React, { useState, useEffect } from 'react';
import { DollarSign, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FinanceDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState({
        revenue_today: 0,
        revenue_month: 0,
        total_invoices: 0,
        unpaid_invoices: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFinanceStats = async () => {
            setLoading(true);
            try {
                const res = await fetch(API_BASE_URL + '/api/reports/dashboard');
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        revenue_today: data.financial.today.revenue,
                        revenue_month: data.financial.mtd,
                        total_invoices: data.operational.total_patients, // Using as proxy since endpoint doesn't return count
                        unpaid_invoices: data.operational.unpaid_today
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFinanceStats();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">اللوحة المالية (Finance Dashboard)</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">الإيرادات اليومية</p>
                        <h3 className="text-xl font-bold text-slate-800">{Number(stats.revenue_today || 0).toLocaleString()} ج.م</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">إيرادات الشهر الحالي</p>
                        <h3 className="text-xl font-bold text-slate-800">{Number(stats.revenue_month || 0).toLocaleString()} ج.م</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">إجمالي الفواتير</p>
                        <h3 className="text-xl font-bold text-slate-800">{stats.total_invoices || 0}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">الفواتير غير المدفوعة</p>
                        <h3 className="text-xl font-bold text-slate-800">0</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
                <p>مخططات وتقارير تفصيلية قريباً...</p>
            </div>
        </div>
    );
};

export default FinanceDashboard;
