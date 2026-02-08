import React from 'react';
import { Bell, Search, User } from 'lucide-react';

const Header = () => {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 transition-all duration-300">
            {/* Search Bar */}
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-96 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                <Search size={18} className="text-gray-500 ml-2" />
                <input
                    type="text"
                    placeholder="بحث سريع..."
                    className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
                />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 border-r border-gray-200 pr-4 mr-2">
                    <div className="text-left hidden md:block">
                        <p className="text-sm font-semibold text-gray-800 leading-none">عمرو سيف</p>
                        <p className="text-xs text-gray-500 mt-1">مدير النظام</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
                        <User size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
