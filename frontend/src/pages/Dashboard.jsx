import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    Activity,
    CreditCard,
    TrendingUp,
    DollarSign,
    Lock,
    RefreshCw,
    Printer
} from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState('owner'); // 'owner' or 'reception'
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        operational: { total_patients: 0, today_visits: 0, lab_results: 0, unpaid_today: 0 },
        financial: { today: { revenue: 0, discounts: 0 }, mtd: 0, ytd: 0 }
    });

    const todayDate = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/reports/dashboard');
            if (!res.ok) {
                console.error("Failed to fetch dashboard stats:", res.status, res.statusText);
                return;
            }
            const data = await res.json();
            if (data && data.operational && data.financial) {
                setStats(data);
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDay = async () => {
        if (!window.confirm('هل أنت متأكد من إغلاق اليوم؟\nهذا الإجراء سيقوم بتثبيت الإيرادات ولا يمكن التراجع عنه.')) return;

        try {
            const res = await fetch('http://localhost:5000/api/reports/close-day', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(`تم إغلاق اليوم بنجاح.\nالإيراد: ${data.revenue} ج.م\nعدد الفواتير: ${data.count}`);
            } else {
                alert('خطأ: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء إغلاق اليوم');
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subValue, trend, onClick }) => (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-95' : ''}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
                    <div className="text-2xl font-bold text-slate-800">{value}</div>
                </div>
                <div className={`p-3 rounded-lg ${color} shadow-sm`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
            {(subValue || trend) && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t border-slate-50 mt-2">
                    {trend && <span className="text-green-600 font-medium flex items-center">{trend} <TrendingUp size={14} className="ml-1" /></span>}
                    {subValue && <span className="text-slate-400">{subValue}</span>}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-1">لوحة التحكم</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-500">مرحباً بك، {userRole === 'owner' ? 'د. عمرو سيف' : 'موظف الاستقبال'}</p>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <p className="text-blue-600 font-medium">{todayDate}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Role Switcher (Demo Only) */}
                    <div className="bg-slate-100 p-1 rounded-lg flex text-sm">
                        <button
                            onClick={() => setUserRole('reception')}
                            className={`px-3 py-1.5 rounded-md transition-all ${userRole === 'reception' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500'}`}
                        >
                            استقبال
                        </button>
                        <button
                            onClick={() => setUserRole('owner')}
                            className={`px-3 py-1.5 rounded-md transition-all ${userRole === 'owner' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500'}`}
                        >
                            إدارة
                        </button>
                    </div>

                    <button onClick={fetchStats} className="p-2 text-slate-400 hover:text-blue-600 transition bg-white border border-slate-200 rounded-lg shadow-sm">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {userRole === 'reception' && (
                        <button
                            onClick={() => navigate('/cash-report')}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 transition shadow-lg shadow-slate-900/20"
                        >
                            <Printer size={18} />
                            <span>تقرير الكاشير</span>
                        </button>
                    )}

                    {userRole === 'owner' && (
                        <button
                            onClick={handleCloseDay}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 transition shadow-lg shadow-slate-900/20"
                        >
                            <Lock size={18} />
                            <span>إغلاق اليوم (Night Run)</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Operational Stats (Visible to All) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="المرضى المسجلين"
                    value={stats?.operational?.total_patients || 0}
                    icon={Users}
                    color="bg-blue-500"
                    trend="+12%"
                    subValue="مباشرة من السجلات"
                    onClick={() => navigate('/patients')}
                />
                <StatCard
                    title="حالات اليوم"
                    value={stats?.operational?.today_visits || 0}
                    icon={Calendar}
                    color="bg-emerald-500"
                    subValue="عرض القائمة"
                    onClick={() => navigate('/patients')}
                />
                <StatCard
                    title="نتائج المعمل"
                    value={stats?.operational?.lab_results || 0}
                    icon={Activity}
                    color="bg-purple-500"
                    subValue="التحاليل المعلقة"
                    onClick={() => navigate('/laboratory')}
                />
                <StatCard
                    title="فواتير غير مدفوعة"
                    value={stats?.operational?.unpaid_today || 0}
                    icon={CreditCard}
                    color="bg-orange-500"
                    subValue="تحصيل اليوم"
                    onClick={() => navigate('/invoices')}
                />
            </div>

            {/* Financial Stats (Owner Only) */}
            {userRole === 'owner' && (
                <div className="border-t border-slate-200 pt-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign className="text-green-600" size={24} />
                            التقارير المالية والتحصيل
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard
                            title="إيرادات اليوم (Daily)"
                            value={`${Number(stats?.financial?.today?.revenue || 0).toLocaleString()} ج.م`}
                            icon={DollarSign}
                            color="bg-green-600"
                            subValue={`خصومات اليوم: ${Number(stats?.financial?.today?.discounts || 0).toLocaleString()}`}
                            onClick={() => navigate('/cash-report')}
                        />
                        <StatCard
                            title="تحصيل الكاشير"
                            value="تقرير اليوم"
                            icon={Printer}
                            color="bg-slate-700"
                            subValue="إغلاق وردية"
                            onClick={() => navigate('/cash-report')}
                        />
                        <StatCard
                            title="إيرادات الشهر (MTD)"
                            value={`${Number(stats?.financial?.mtd || 0).toLocaleString()} ج.م`}
                            icon={TrendingUp}
                            color="bg-blue-600"
                            onClick={() => navigate('/finance-dashboard')}
                        />
                        <StatCard
                            title="إيرادات السنة (YTD)"
                            value={`${Number(stats?.financial?.ytd || 0).toLocaleString()} ج.م`}
                            icon={Activity}
                            color="bg-indigo-600"
                            onClick={() => navigate('/finance-dashboard')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
