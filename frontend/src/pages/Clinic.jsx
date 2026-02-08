import React, { useState, useEffect } from 'react';
import { Activity, Users, Clock, FileText, CheckCircle, ChevronLeft, Calendar, User, Search, AlertCircle, History } from 'lucide-react';

const Clinic = () => {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        complaint: '',
        diagnosis: '',
        treatment: '',
        notes: ''
    });

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/doctor/queue', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQueue(data);
            }
        } catch (err) { console.error(err); }
    };

    const fetchPatientHistory = async (patientId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/doctor/history/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        fetchPatientHistory(patient.patient_id);
        setFormData({ complaint: '', diagnosis: '', treatment: '', notes: '' });
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/doctor/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    invoice_id: selectedPatient.invoice_id,
                    patient_id: selectedPatient.patient_id,
                    ...formData
                })
            });
            if (res.ok) {
                alert('تم حفظ التقرير الطبي بنجاح');
                setSelectedPatient(null);
                fetchQueue();
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-120px)]">
            {/* Queue Sidebar */}
            <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" />
                        قائمة الانتظار
                    </h2>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                        {queue.length} مرضى
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y">
                    {queue.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Users size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">لا يوجد مرضى في الانتظار</p>
                        </div>
                    ) : (
                        queue.map((item) => (
                            <button
                                key={item.invoice_id}
                                onClick={() => handleSelectPatient(item)}
                                className={`w-full text-right p-4 hover:bg-blue-50 transition-colors ${selectedPatient?.invoice_id === item.invoice_id ? 'bg-blue-50 border-r-4 border-blue-600' : ''}`}
                            >
                                <p className="font-bold text-slate-800 mb-1">{item.patient_name}</p>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>#{item.invoice_id.slice(0, 5)}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {selectedPatient ? (
                    <div className="flex flex-col h-full gap-6">
                        {/* Patient Ribbon */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{selectedPatient.patient_name}</h3>
                                    <p className="text-sm text-slate-500">رقم الهاتف: {selectedPatient.phone || 'غير مسجل'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${showHistory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                <History size={20} />
                                <span>{showHistory ? 'إخفاء السجل المرضي' : 'عرض السجل المرضي'}</span>
                            </button>
                        </div>

                        <div className="flex-1 flex gap-6 overflow-hidden">
                            {/* Report Form */}
                            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto p-6">
                                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <FileText size={20} className="text-blue-600" />
                                    التقرير الطبي الحالي
                                </h4>
                                <form onSubmit={handleSubmitReport} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">الشكوى (Complaint)</label>
                                        <textarea
                                            className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all min-h-[100px]"
                                            placeholder="ماذا يشتكي منه المريض؟"
                                            value={formData.complaint}
                                            onChange={e => setFormData({ ...formData, complaint: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">التشخيص (Diagnosis)</label>
                                            <textarea
                                                className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all min-h-[100px]"
                                                placeholder="التشخيص الطبي..."
                                                value={formData.diagnosis}
                                                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                                                required
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">العلاج (Treatment)</label>
                                            <textarea
                                                className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all min-h-[100px]"
                                                placeholder="الأدوية الموصوفة..."
                                                value={formData.treatment}
                                                onChange={e => setFormData({ ...formData, treatment: e.target.value })}
                                                required
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات إضافية</label>
                                        <textarea
                                            className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                            placeholder="أي ملاحظات أخرى..."
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-600/20 flex items-center gap-2"
                                        >
                                            <CheckCircle size={20} />
                                            حفظ التقرير وإكمال الزيارة
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Sidebar History (Conditional) */}
                            {showHistory && (
                                <div className="w-96 bg-slate-50 rounded-xl border border-slate-200 overflow-y-auto flex flex-col animate-in slide-in-from-left duration-300">
                                    <div className="p-4 border-b bg-white font-bold text-slate-800 sticky top-0 flex items-center gap-2">
                                        <History size={18} className="text-blue-600" />
                                        السجل الطبي التاريخي
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {loading ? (
                                            <div className="text-center py-10 text-slate-500">جاري التحميل...</div>
                                        ) : (
                                            <>
                                                {/* Medical Reports */}
                                                <div className="space-y-2">
                                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">زيارات سابقة ({history?.medical_reports.length})</h5>
                                                    {history?.medical_reports.length === 0 ? <p className="text-xs text-slate-400">لا يوجد سجلات سابقة</p> :
                                                        history?.medical_reports.map(r => (
                                                            <div key={r.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                                <div className="flex justify-between items-center mb-2 border-b pb-1">
                                                                    <span className="font-bold text-blue-700 underline">{new Date(r.created_at).toLocaleDateString()}</span>
                                                                    <span className="text-xs text-slate-500">د/ {r.doctor_name}</span>
                                                                </div>
                                                                <p className="mb-1"><strong>تشخيص:</strong> {r.diagnosis}</p>
                                                                <p className="text-xs text-slate-500 italic"><strong>علاج:</strong> {r.treatment}</p>
                                                            </div>
                                                        ))
                                                    }
                                                </div>

                                                {/* Radiology */}
                                                <div className="space-y-2">
                                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">الأشعة ({history?.radiology.length})</h5>
                                                    {history?.radiology.map(rad => (
                                                        <div key={rad.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="font-bold">{rad.service_type}</span>
                                                                <span className="text-slate-500">{new Date(rad.visit_date).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 line-clamp-2">{rad.report_text}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Lab */}
                                                <div className="space-y-2">
                                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">المعمل ({history?.lab.length})</h5>
                                                    {history?.lab.map(lab => (
                                                        <div key={lab.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="font-bold">{lab.test_type}</span>
                                                                <span className="text-slate-500">{new Date(lab.visit_date).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-xs text-green-600 font-medium">مكتملة ({lab.result_count} تحليل)</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Activity size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">مرحباً بك دكتور</h3>
                        <p className="max-w-xs">يرجى اختيار مريض من قائمة الانتظار للبدء في كتابة التقرير الطبي والاطلاع على السجل المسبق.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Clinic;
