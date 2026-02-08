import React, { useState } from 'react';
import { Truck, Plus } from 'lucide-react';

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Placeholder - Implement API calls Phase 11

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Truck size={28} className="text-blue-600" /> إدارة الموردين
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
                <p>قائمة الموردين قريباً..</p>
                <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto">
                    <Plus size={18} /> إضافة مورد
                </button>
            </div>
        </div>
    );
};

export default Suppliers;
