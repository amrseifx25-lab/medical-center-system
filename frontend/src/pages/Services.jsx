import API_BASE_URL from '../api';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Check, X, Search, Tag } from 'lucide-react';

const Services = () => {
    const [services, setServices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        price: '',
        category: 'Other', // Default
        is_active: true
    });

    // Categories: Value -> Display Label
    const categories = [
        { value: 'Radiology', label: 'أشعة' },
        { value: 'Lab', label: 'تحاليل' },
        { value: 'Other', label: 'أخرى' }
    ];

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            // Fetch ALL services (including inactive) for management
            const res = await fetch(API_BASE_URL + '/api/services?active=all');
            const data = await res.json();
            setServices(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditing
            ? `/api/services/${formData.id}`
            : '/api/services';

        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowModal(false);
                fetchServices();
                resetForm();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (service) => {
        setFormData({
            id: service.id,
            name: service.name,
            price: service.price,
            category: service.category,
            is_active: service.is_active
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleToggleStatus = async (service) => {
        try {
            const res = await fetch(`/api/services/${service.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...service, is_active: !service.is_active })
            });
            if (res.ok) fetchServices();
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setFormData({ id: '', name: '', price: '', category: 'Consultation', is_active: true });
        setIsEditing(false);
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">إدارة الخدمات والأسعار</h1>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus size={20} />
                    <span>إضافة خدمة جديدة</span>
                </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="بحث عن خدمة..."
                        className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Services Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                            <th className="p-4">اسم الخدمة</th>
                            <th className="p-4">التصنيف</th>
                            <th className="p-4">السعر</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.map(service => (
                            <tr key={service.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-4 font-medium">{service.name}</td>
                                <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                                        {categories.find(c => c.value === service.category)?.label || service.category}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-slate-700">{service.price} ج.م</td>
                                <td className="p-4">
                                    <button
                                        onClick={() => handleToggleStatus(service)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${service.is_active
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                    >
                                        {service.is_active ? 'نشط' : 'غير نشط'}
                                    </button>
                                </td>
                                <td className="p-4 flex gap-2">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                                    >
                                        <Edit size={16} /> تعديل
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">
                            {isEditing ? 'تعديل خدمة' : 'إضافة خدمة جديدة'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">اسم الخدمة</label>
                                <input
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">التصنيف</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">السعر (ج.م)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Always show Active Status Checkbox */}
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">الخدمة نشطة</span>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
