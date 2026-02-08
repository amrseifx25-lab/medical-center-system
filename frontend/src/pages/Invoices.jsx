import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, DollarSign, Printer, Filter, Check, X, Tag, FileDown, Pencil, Ban } from 'lucide-react';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [patients, setPatients] = useState([]);
    const [services, setServices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        patient_id: '',
        items: [{ service_id: '', service_name: '', unit_price: 0, quantity: 1 }],
        coupon_code: '',
        payment_method: '', // if empty, status = unpaid
        doctor_id: ''
    });

    // New Settlement States
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [ownerPaymentType, setOwnerPaymentType] = useState('Cash'); // Cash or Profit
    const [doctors, setDoctors] = useState([]);

    // Fetch Initial Data
    useEffect(() => {
        fetchInvoices();
        fetchPatients();
        fetchServices();
        fetchEmployees();
        fetchDoctors();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/hr/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (err) { console.error(err); }
    };

    const fetchDoctors = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/users');
            if (res.ok) {
                const data = await res.json();
                setDoctors(data.filter(u => u.role_name === 'Doctor'));
            }
        } catch (err) { console.error(err); }
    };

    // ... (rest of existing fetch functions)

    // ...



    // ...



    // Auth & Date Helpers
    const userRole = localStorage.getItem('userRole'); //'reception', 'manager'
    const isToday = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');

    // Void State
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidId, setVoidId] = useState(null);

    const [voidReason, setVoidReason] = useState('');

    // Settle State
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settleId, setSettleId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, Owner, Employee Deduction

    // Edit State
    const [editingId, setEditingId] = useState(null);

    // Fetch Initial Data


    const fetchInvoices = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/invoices');
            const data = await res.json();
            setInvoices(data);
        } catch (err) { console.error(err); }
    };

    const fetchPatients = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/patients');
            const data = await res.json();
            setPatients(data);
        } catch (err) { console.error(err); }
    };

    const fetchServices = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/services');
            const data = await res.json();
            setServices(data);
        } catch (err) { console.error(err); }
    };

    // Calculation Logic
    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
        let discount = 0;

        if (appliedCoupon) {
            if (appliedCoupon.discount_type === 'percentage') {
                discount = subtotal * (Number(appliedCoupon.value) / 100);
            } else {
                discount = Number(appliedCoupon.value);
            }
        }

        return {
            subtotal,
            discount,
            final: Math.max(0, subtotal - discount)
        };
    };

    const totals = calculateTotals();

    // Handlers
    const handleServiceChange = (index, serviceId) => {
        const service = services.find(s => s.id === parseInt(serviceId));
        const newItems = [...formData.items];
        newItems[index] = {
            service_id: serviceId,
            service_name: service ? service.name : '',
            unit_price: service ? service.price : 0,
            quantity: 1
        };
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { service_id: '', service_name: '', unit_price: 0, quantity: 1 }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const applyCoupon = async () => {
        if (!couponCode) return;
        setCouponError('');
        try {
            const res = await fetch('http://localhost:5000/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode })
            });
            const data = await res.json();
            if (data.valid) {
                setAppliedCoupon(data.coupon);
                setFormData({ ...formData, coupon_code: couponCode });
            } else {
                setCouponError(data.message);
                setAppliedCoupon(null);
            }
        } catch (err) { console.error(err); }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setFormData({ ...formData, coupon_code: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.items.length === 0 || !formData.items[0].service_id) {
            alert('يجب اختيار خدمة واحدة على الأقل');
            return;
        }

        const url = editingId
            ? `http://localhost:5000/api/invoices/${editingId}`
            : 'http://localhost:5000/api/invoices';

        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchInvoices();
                // Reset Form
                setFormData({ patient_id: '', items: [{ service_id: '', service_name: '', unit_price: 0, quantity: 1 }], coupon_code: '', payment_method: '', doctor_id: '' });
                setAppliedCoupon(null);
                setCouponCode('');
                setEditingId(null);
                alert(editingId ? 'تم تعديل الفاتورة بنجاح' : 'تم حفظ الفاتورة بنجاح');
            } else {
                const errData = await res.json();
                alert('فشل الحفظ: ' + (errData.message || 'خطأ غير معروف'));
            }
        } catch (err) {
            console.error(err);
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    const handleEdit = async (invoice) => {
        try {
            const res = await fetch(`http://localhost:5000/api/invoices/${invoice.id}`);
            if (res.ok) {
                const data = await res.json();
                setEditingId(invoice.id);
                setFormData({
                    patient_id: data.patient_id,
                    items: data.items.map(i => ({
                        service_id: i.service_id,
                        service_name: i.service_name,
                        unit_price: i.unit_price,
                        quantity: i.quantity
                    })),
                    coupon_code: data.coupon_code || '',
                    payment_method: ''
                });
                setCouponCode(data.coupon_code || '');
                setShowModal(true);
            }
        } catch (err) { console.error(err); }
    };

    const handleVoid = async () => {
        if (!voidReason) return alert('السبب مطلوب');
        try {
            const res = await fetch(`http://localhost:5000/api/invoices/${voidId}/void`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: voidReason })
            });

            if (res.ok) {
                setShowVoidModal(false);
                setVoidId(null);
                setVoidReason('');
                fetchInvoices();
                alert('تم إلغاء الفاتورة بنجاح');
            } else {
                const errData = await res.json();
                alert('فشل الإلغاء: ' + (errData));
            }
        } catch (err) { console.error(err); }
    };

    const handleSettle = async () => {
        // Validation
        if (paymentMethod === 'Employee Deduction' && !selectedEmployee) {
            alert('يجب اختيار الموظف');
            return;
        }

        let finalMethod = paymentMethod;
        if (paymentMethod === 'Owner') {
            finalMethod = `Owner - ${ownerPaymentType}`;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/invoices/${settleId}/settle`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_method: finalMethod,
                    employee_id: paymentMethod === 'Employee Deduction' ? selectedEmployee : null
                })
            });

            if (res.ok) {
                setShowSettleModal(false);
                setSettleId(null);
                fetchInvoices();
                alert('تم تحصيل الفاتورة بنجاح');
            } else {
                alert('فشل التحصيل');
            }
        } catch (err) { console.error(err); }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ patient_id: '', items: [{ service_id: '', service_name: '', unit_price: 0, quantity: 1 }], coupon_code: '', payment_method: '', doctor_id: '' });
        setAppliedCoupon(null);
        setCouponCode('');
    };

    const generateInvoiceHTML = (data) => {
        return `
            <html>
                <head>
                    <title>Invoice #${data.id.slice(0, 8)}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                        body { font-family: 'Cairo', sans-serif; padding: 40px; direction: rtl; background: #fff; color: #1e293b; max-width: 800px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #1e3a8a; }
                        .brand h1 { color: #1e3a8a; margin: 0; font-size: 28px; font-weight: 800; }
                        .brand p { color: #64748b; margin: 5px 0 0; font-size: 14px; }
                        .invoice-tag { background: #eff6ff; padding: 10px 20px; border-radius: 8px; text-align: center; border: 1px solid #dbeafe; }
                        .invoice-tag h2 { margin: 0; color: #1e3a8a; font-size: 16px; font-weight: 700; }
                        .invoice-tag span { font-family: monospace; font-size: 18px; color: #334155; display: block; margin-top: 5px; font-weight: 600; }
                        
                        .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                        .info-box h3 { font-size: 12px; color: #94a3b8; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
                        .info-box div { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
                        
                        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                        th { background: #1e3a8a; color: white; padding: 12px 16px; text-align: right; font-weight: 600; font-size: 14px; }
                        td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; }
                        tr:last-child td { border-bottom: none; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        
                        .totals { margin-right: auto; width: 300px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #64748b; }
                        .row strong { color: #1e293b; }
                        .row.final { border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 10px; color: #1e3a8a; font-size: 18px; font-weight: 800; }
                        
                        .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="brand">
                            <h1>المركز الطبي المتكامل</h1>
                            <p>Medical Center System</p>
                        </div>
                        <div class="invoice-tag">
                            <h2>رقم الفاتورة</h2>
                            <span>#${data.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="grid-info">
                        <div class="info-box">
                            <h3>بيانات المريض</h3>
                            <div>${data.patient_name}</div>
                        </div>
                        <div class="info-box" style="text-align: left;">
                            <h3>تفاصيل الفاتورة</h3>
                            <div>التاريخ: ${new Date(data.created_at).toLocaleDateString()}</div>
                            <div>الحالة: <span style="color: ${data.status === 'paid' ? '#16a34a' : '#ea580c'}">${data.status === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span></div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>الخدمة</th>
                                <th>السعر</th>
                                <th>الكمية</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map(item => `
                                <tr>
                                    <td>${item.service_name}</td>
                                    <td>${Number(item.unit_price).toFixed(2)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${Number(item.subtotal).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals">
                        <div class="row">
                            <span>الإجمالي الفرعي</span>
                            <strong>${Number(data.total_amount).toFixed(2)} ج.م</strong>
                        </div>
                        ${Number(data.discount_amount) > 0 ? `
                        <div class="row" style="color: #16a34a;">
                            <span>خصم</span>
                            <strong>-${Number(data.discount_amount).toFixed(2)} ج.م</strong>
                        </div>` : ''}
                        <div class="row final">
                            <span>الإجمالي الصافي</span>
                            <span>${Number(data.final_amount).toFixed(2)} ج.م</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>شكراً لثقتكم بالمركز الطبي المتكامل</p>
                        <p>هذه الفاتورة مستخرجة إلكترونياً ولا تحتاج إلى توقيع</p>
                    </div>
                </body>
            </html>
        `;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">الفواتير والمدفوعات</h1>
                <button
                    onClick={() => { setEditingId(null); setShowModal(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    <span>إنشاء فاتورة جديدة</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                        <tr>
                            <th className="p-4">رقم الفاتورة</th>
                            <th className="p-4">المريض</th>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">القيمة</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length > 0 ? (
                            invoices.map((invoice) => (
                                <tr key={invoice.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-600 font-mono text-sm">#{invoice.id.slice(0, 8)}</td>
                                    <td className="p-4 font-medium text-slate-800">{invoice.patient_name}</td>
                                    <td className="p-4 text-slate-500 text-sm">{new Date(invoice.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold text-slate-800">{Number(invoice.final_amount).toLocaleString()} ج.م</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${invoice.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                            }`}>
                                            {invoice.status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        {/* Settle Button */}
                                        {invoice.status === 'unpaid' && (
                                            <button
                                                onClick={() => { setSettleId(invoice.id); setShowSettleModal(true); }}
                                                className="text-slate-400 hover:text-green-600 transition p-2"
                                                title="تحصيل الفاتورة"
                                            >
                                                <DollarSign size={18} />
                                            </button>
                                        )}
                                        {/* Edit Button */}
                                        {(invoice.status === 'unpaid' || (invoice.status === 'paid' && userRole === 'manager' && isToday(invoice.created_at))) && (
                                            <button
                                                onClick={() => handleEdit(invoice)}
                                                className="text-slate-400 hover:text-green-600 transition p-2"
                                                title={invoice.status === 'paid' ? "تعديل (مدير وبنفس اليوم)" : "تعديل الفاتورة"}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}

                                        {/* Void Button - Reception can use it */}
                                        {invoice.status !== 'void' && (
                                            <button
                                                onClick={() => { setVoidId(invoice.id); setShowVoidModal(true); }}
                                                className="text-slate-400 hover:text-red-500 transition p-2"
                                                title="إلغاء الفاتورة"
                                            >
                                                <Ban size={18} />
                                            </button>
                                        )}

                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`http://localhost:5000/api/invoices/${invoice.id}`);
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        const printWindow = window.open('', '_blank');
                                                        printWindow.document.write(generateInvoiceHTML(data));
                                                        printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
                                                        printWindow.document.close();
                                                    }
                                                } catch (err) { console.error(err); alert('فشل تحميل تفاصيل الفاتورة'); }
                                            }}
                                            className="text-slate-400 hover:text-blue-600 transition p-2"
                                            title="طباعة"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`http://localhost:5000/api/invoices/${invoice.id}`);
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        const element = document.createElement('div');
                                                        element.innerHTML = generateInvoiceHTML(data);

                                                        const opt = {
                                                            margin: 0,
                                                            filename: `invoice_${data.id.slice(0, 8)}.pdf`,
                                                            image: { type: 'jpeg', quality: 0.98 },
                                                            html2canvas: { scale: 2, useCORS: true },
                                                            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                                                        };

                                                        if (window.html2pdf) {
                                                            window.html2pdf().set(opt).from(element).save();
                                                        } else {
                                                            alert('مكتبة PDF غير محملة. يرجى تحديث الصفحة.');
                                                        }
                                                    }
                                                } catch (err) { console.error(err); alert('فشل تحميل PDF'); }
                                            }}
                                            className="text-slate-400 hover:text-red-600 transition p-2"
                                            title="تحميل PDF"
                                        >
                                            <FileDown size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">لا توجد فواتير مسجلة</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">فاتورة جديدة</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Patient Select */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">المريض</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white"
                                    value={formData.patient_id}
                                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                >
                                    <option value="">اختر المريض...</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                </select>
                            </div>

                            {/* Doctor Select */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">الطبيب المعالج</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white"
                                    value={formData.doctor_id}
                                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                                >
                                    <option value="">اختر الطبيب...</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                </select>
                            </div>

                            {/* Services List */}
                            <div className="mb-6 space-y-3">
                                <label className="block text-sm font-medium text-slate-700">الخدمات</label>
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <select
                                            className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white text-sm"
                                            value={item.service_id}
                                            onChange={(e) => handleServiceChange(index, e.target.value)}
                                        >
                                            <option value="">اختر الخدمة...</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - {s.price} ج.م</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-20 p-2.5 border border-slate-300 rounded-lg text-center"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...formData.items];
                                                newItems[index].quantity = parseInt(e.target.value);
                                                setFormData({ ...formData, items: newItems });
                                            }}
                                        />
                                        <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 font-bold min-w-[80px] text-center border border-slate-100">
                                            {(Number(item.unit_price) * Number(item.quantity)).toFixed(0)}
                                        </div>
                                        {formData.items.length > 1 && (
                                            <button onClick={() => removeItem(index)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg">
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={addItem} className="text-sm text-blue-600 font-medium hover:underline">+ إضافة خدمة أخرى</button>
                            </div>

                            {/* Coupon Section */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                <label className="block text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                                    <Tag size={16} /> كوبون خصم
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 border border-blue-200 rounded-lg focus:border-blue-500 outline-none uppercase font-mono"
                                        placeholder="كود الكوبون"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <button onClick={removeCoupon} className="bg-red-100 text-red-600 px-4 rounded-lg font-medium hover:bg-red-200 transition">إلغاء</button>
                                    ) : (
                                        <button onClick={applyCoupon} className="bg-blue-600 text-white px-4 rounded-lg font-medium hover:bg-blue-700 transition">تطبيق</button>
                                    )}
                                </div>
                                {couponError && <p className="text-xs text-red-500 mt-2 font-medium">{couponError}</p>}
                                {appliedCoupon && (
                                    <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                                        <Check size={12} /> تم تطبيق الخصم: {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.value}%` : `${appliedCoupon.value} ج.م`}
                                    </p>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="space-y-2 border-t border-slate-100 pt-4">
                                <div className="flex justify-between text-slate-500 text-sm">
                                    <span>الإجمالي الفرعي</span>
                                    <span>{totals.subtotal.toFixed(2)} ج.م</span>
                                </div>
                                <div className="flex justify-between text-green-600 text-sm">
                                    <span>الخصم</span>
                                    <span>- {totals.discount.toFixed(2)} ج.م</span>
                                </div>
                                <div className="flex justify-between text-slate-900 font-bold text-lg pt-2 border-t border-slate-100 mt-2">
                                    <span>الإجمالي النهائي</span>
                                    <span>{totals.final.toFixed(2)} ج.م</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                            <button onClick={handleCloseModal} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">إلغاء</button>
                            <button
                                onClick={handleSubmit}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20"
                                disabled={!formData.patient_id}
                            >
                                {editingId ? 'تعديل الفاتورة' : 'حفظ الفاتورة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">إلغاء الفاتورة</h2>
                        <p className="text-slate-600 mb-4">هل أنت متأكد من رغبتك في إلغاء هذه الفاتورة؟ يجب ذكر السبب.</p>

                        <textarea
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none mb-4 min-h-[100px]"
                            placeholder="سبب الإلغاء (مطلوب)..."
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                        ></textarea>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowVoidModal(false); setVoidId(null); setVoidReason(''); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                تراجع
                            </button>
                            <button
                                onClick={handleVoid}
                                disabled={!voidReason}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                تأكيد الإلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settle Modal */}
            {showSettleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <DollarSign className="text-green-600" />
                            تحصيل الفاتورة
                        </h2>

                        <div className="space-y-4 mb-6">
                            <label className="block text-sm font-medium text-slate-700">طريقة الدفع</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="Cash"
                                        checked={paymentMethod === 'Cash'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-medium">نقدي (Cash)</span>
                                </label>

                                {/* Owner Options */}
                                <div className={`border rounded-lg transition overflow-hidden ${paymentMethod === 'Owner' ? 'border-blue-500 bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                    <label className="flex items-center gap-3 p-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="Owner"
                                            checked={paymentMethod === 'Owner'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-medium">حساب المالك</span>
                                    </label>

                                    {paymentMethod === 'Owner' && (
                                        <div className="px-3 pb-3 pt-0 pl-9 space-y-2 animate-in slide-in-from-top-2">
                                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="ownerPaymentType"
                                                    value="Cash"
                                                    checked={ownerPaymentType === 'Cash'}
                                                    onChange={(e) => setOwnerPaymentType(e.target.value)}
                                                />
                                                دفع نقدي (Cash)
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="ownerPaymentType"
                                                    value="Profit"
                                                    checked={ownerPaymentType === 'Profit'}
                                                    onChange={(e) => setOwnerPaymentType(e.target.value)}
                                                />
                                                خصم من الأرباح (From Profit)
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Employee Deduction */}
                                <div className={`border rounded-lg transition overflow-hidden ${paymentMethod === 'Employee Deduction' ? 'border-blue-500 bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                    <label className="flex items-center gap-3 p-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="Employee Deduction"
                                            checked={paymentMethod === 'Employee Deduction'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-medium">خصم موظف</span>
                                    </label>

                                    {paymentMethod === 'Employee Deduction' && (
                                        <div className="px-3 pb-3 pt-0 pl-9 animate-in slide-in-from-top-2">
                                            <select
                                                className="w-full p-2 text-sm border rounded-lg bg-white outline-none focus:border-blue-500"
                                                value={selectedEmployee}
                                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                            >
                                                <option value="">اختر الموظف...</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowSettleModal(false); setSettleId(null); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSettle}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-600/20"
                            >
                                تأكيد التحصيل
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
