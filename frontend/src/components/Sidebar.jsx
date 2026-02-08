import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Activity,
    FlaskConical,
    Calculator,
    Briefcase,
    Settings,
    LogOut,
    FileText,
    Tag,
    PieChart,
    Truck,
    Lock,
    Printer
} from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const allMenuItems = [
        { path: '/', name: 'الرئيسية', icon: LayoutDashboard, roles: ['Admin', 'Receptionist', 'Doctor', 'Accountant', 'HR', 'Lab', 'Radiology'] },
        { path: '/patients', name: 'المرضى', icon: Users, roles: ['Admin', 'Receptionist', 'Doctor'] },
        { path: '/invoices', name: 'الفواتير', icon: FileText, roles: ['Admin', 'Receptionist', 'Accountant'] },
        { path: '/services', name: 'الخدمات', icon: Tag, roles: ['Admin', 'Receptionist', 'Accountant', 'Doctor'] },
        { path: '/coupons', name: 'الكوبونات', icon: Tag, roles: ['Admin', 'Receptionist', 'Accountant'] },
        { path: '/radiology', name: 'الأشعة', icon: Activity, roles: ['Admin', 'Doctor', 'Receptionist', 'Radiology'] },
        { path: '/laboratory', name: 'المعمل', icon: FlaskConical, roles: ['Admin', 'Doctor', 'Receptionist', 'Lab'] },
        { path: '/accounting', name: 'الحسابات', icon: Calculator, roles: ['Admin', 'Accountant'] },
        { path: '/finance-dashboard', name: 'لوحة المالية', icon: PieChart, roles: ['Admin', 'Accountant'] },
        { path: '/suppliers', name: 'الموردين', icon: Truck, roles: ['Admin', 'Accountant'] },
        { path: '/hr', name: 'الموارد البشرية', icon: Briefcase, roles: ['Admin', 'HR'] },
        { path: '/cash-report', name: 'تقرير الكاشير', icon: Printer, roles: ['Admin', 'Receptionist', 'Accountant'] },
        { path: '/clinic', name: 'عيادة الطبيب', icon: Activity, roles: ['Admin', 'Doctor'] },
        { path: '/settings', name: 'الإعدادات', icon: Settings, roles: ['Admin'] },
    ];

    const filteredItems = allMenuItems.filter(item =>
        user && (item.roles.includes(user.role) || user.role === 'Admin')
    );

    return (
        <div className="h-screen w-64 bg-[#1e293b] text-white flex flex-col fixed right-0 top-0 shadow-2xl z-20 transition-all duration-300">
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-center border-b border-slate-700 bg-[#0f172a]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Activity className="text-white" size={20} />
                    </div>
                    <span className="text-xl font-bold tracking-wider">Medical<span className="text-blue-500">Center</span></span>
                </div>
            </div>

            {/* User Info */}
            {user && (
                <div className="p-4 border-b border-slate-700 bg-[#1e293b]">
                    <p className="text-sm font-bold text-white">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.role}</p>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto py-6">
                <ul className="space-y-1 px-3">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                                        }`}
                                >
                                    <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
                                    <span className="font-medium text-sm">{item.name}</span>
                                    {isActive && <div className="mr-auto w-1 h-1 bg-white rounded-full"></div>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors text-sm font-medium"
                >
                    <LogOut size={18} />
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
