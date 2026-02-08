import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, Copy } from 'lucide-react';

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        prefix: 'OFFER',
        discount_type: 'percentage',
        value: 10,
        count: 5,
        expiry_date: ''
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/coupons');
            const data = await res.json();
            setCoupons(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/coupons/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchCoupons();
            }
        } catch (err) { console.error(err); }
    };

    const deleteCoupon = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
        try {
            await fetch(`http://localhost:5000/api/coupons/${id}`, { method: 'DELETE' });
            fetchCoupons();
        } catch (err) { console.error(err); }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('تم نسخ الكود: ' + text);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">إدارة الكوبونات</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            if (coupons.length === 0) return alert('لا توجد بيانات للتصدير');
                            const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
                                + "Code,Type,Value,Used,Limit,Expiry\n"
                                + coupons.map(c => `${c.code},${c.discount_type},${c.value},${c.used_count},${c.usage_limit || 'Infinity'},${c.expiry_date || 'None'}`).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", "coupons_export.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-600/20"
                    >
                        <Copy size={20} /> {/* Using Copy icon as proxy for Export since FileSpreadsheet isn't imported yet */}
                        <span>تصدير Excel</span>
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={20} />
                        <span>إنشاء دفعة كوبونات</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                        <tr>
                            <th className="p-4">الكود</th>
                            <th className="p-4">نوع الخصم</th>
                            <th className="p-4">القيمة</th>
                            <th className="p-4">الاستخدام</th>
                            <th className="p-4">انتهاء الصلاحية</th>
                            <th className="p-4 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coupons.map((coupon) => (
                            <tr key={coupon.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono font-bold text-blue-600 cursor-pointer" onClick={() => copyToClipboard(coupon.code)}>
                                    <div className="flex items-center gap-2">
                                        <Tag size={16} />
                                        {coupon.code}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-600">{coupon.discount_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</td>
                                <td className="p-4 font-bold text-slate-800">{coupon.value} {coupon.discount_type === 'percentage' ? '%' : 'ج.م'}</td>
                                <td className="p-4 text-slate-600">{coupon.used_count} / {coupon.usage_limit || '∞'}</td>
                                <td className="p-4 text-slate-500 text-sm">
                                    {coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'مفتوح'}
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={() => deleteCoupon(coupon.id)} className="text-red-400 hover:text-red-600 transition p-2">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">توليد كوبونات</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">بادئة الكود (Prefix)</label>
                                <input name="prefix" value={formData.prefix} onChange={e => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })} type="text" className="w-full p-2 border border-slate-300 rounded-lg uppercase font-mono" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">نوع الخصم</label>
                                    <select name="discount_type" value={formData.discount_type} onChange={e => setFormData({ ...formData, discount_type: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">
                                        <option value="percentage">نسبة %</option>
                                        <option value="fixed">مبلغ ثابت</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">القيمة</label>
                                    <input name="value" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} type="number" className="w-full p-2 border border-slate-300 rounded-lg" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">عدد الكوبونات</label>
                                <input name="count" value={formData.count} onChange={e => setFormData({ ...formData, count: e.target.value })} type="number" className="w-full p-2 border border-slate-300 rounded-lg" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">حد الاستخدام (Usage Limit)</label>
                                <input
                                    name="usage_limit"
                                    value={formData.usage_limit}
                                    onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                                    type="number"
                                    min="1"
                                    placeholder="1 = استخدام مرة واحدة"
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                />
                                <p className="text-xs text-slate-500 mt-1">اتركه فارغاً للاستخدام مرة واحدة افتراضياً</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الانتهاء</label>
                                <input name="expiry_date" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} type="date" className="w-full p-2 border border-slate-300 rounded-lg" />
                            </div>

                            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20 mt-4">
                                توليد الكوبونات
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Coupons;
