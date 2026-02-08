import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Database, Shield, Lock } from 'lucide-react';
import UserManagement from './UserManagement';

const SettingsLayout = () => {
    const location = useLocation();

    const tabs = [
        { path: '/settings/users', name: 'Users & Permissions', icon: Users },
        // Add more settings tabs here as needed
        { path: '/settings/backup', name: 'Backup & Restore', icon: Database },
    ];

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">System Settings</h1>

            <div className="flex gap-4 border-b border-slate-200 mb-6">
                {tabs.map(tab => {
                    const isActive = location.pathname.startsWith(tab.path);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${isActive
                                    ? 'border-blue-600 text-blue-600 font-medium'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.name}
                        </Link>
                    );
                })}
            </div>

            <div className="flex-1 overflow-auto">
                <Routes>
                    <Route path="/" element={<div className="text-slate-500">Select a setting to configure.</div>} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="backup" element={<div className="p-4">Backup tools coming soon...</div>} />
                </Routes>
            </div>
        </div>
    );
};

export default SettingsLayout;
