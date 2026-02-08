import React, { useState, useEffect } from 'react';
import { Activity, Plus, FileText, CheckCircle } from 'lucide-react';

const Radiology = () => {
    const [requests, setRequests] = useState([]);
    const [patients, setPatients] = useState([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const [newRequestData, setNewRequestData] = useState({ patient_id: '', service_type: '' });
    const [reportData, setReportData] = useState({ content: '' });

    // Fetch Data
    useEffect(() => {
        fetchRequests();
        fetchPatients();
    }, []);

    const fetchRequests = () => {
        fetch('http://localhost:5000/api/radiology')
            .then(res => res.json())
            .then(data => setRequests(data))
            .catch(err => console.log('API Error', err));
    };

    const fetchPatients = () => {
        fetch('http://localhost:5000/api/patients')
            .then(res => res.json())
            .then(data => setPatients(data))
            .catch(err => console.log('API Error', err));
    };

    const handeCreateRequest = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/radiology', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRequestData)
            });
            if (res.ok) {
                setShowRequestModal(false);
                fetchRequests();
                setNewRequestData({ patient_id: '', service_type: '' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveReport = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/radiology/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: selectedRequest.id,
                    content: reportData.content
                })
            });
            if (res.ok) {
                setShowReportModal(false);
                fetchRequests();
                setReportData({ content: '' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openReportModal = (req) => {
        setSelectedRequest(req);
        setShowReportModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">إدارة الأشعة (RIS)</h1>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                            <th className="p-4">المريض</th>
                            <th className="p-4">نوع الفحص</th>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-4 font-medium">{req.patient_name}</td>
                                <td className="p-4">{req.service_type}</td>
                                <td className="p-4 text-slate-500" dir="ltr">{new Date(req.requested_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs ${req.status === 'reported' ? 'bg-green-100 text-green-700' :
                                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100'
                                        }`}>
                                        {req.status === 'reported' ? 'تم التقرير' : 'قيد الانتظار'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {req.status === 'pending' && (
                                        <button
                                            onClick={() => openReportModal(req)}
                                            className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                                        >
                                            <FileText size={16} /> كتابة التقرير
                                        </button>
                                    )}
                                    {req.status === 'reported' && (
                                        <button className="text-green-600 hover:underline text-sm font-medium flex items-center gap-1">
                                            <CheckCircle size={16} /> عرض التقرير
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-400">لا توجد طلبات أشعة حالياً</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>



            {/* Write Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">كتابة تقرير الأشعة - {selectedRequest?.patient_name}</h3>
                        <form onSubmit={handleSaveReport} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">نوع الفحص</label>
                                <input disabled value={selectedRequest?.service_type} className="w-full p-2 border rounded-lg bg-slate-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">نتائج التقرير</label>
                                <textarea
                                    required
                                    rows="10"
                                    className="w-full p-3 border rounded-lg font-mono text-sm leading-relaxed"
                                    placeholder="اكتب التقرير الطبي هنا..."
                                    value={reportData.content}
                                    onChange={(e) => setReportData({ ...reportData, content: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 text-slate-600">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">اعتماد التقرير</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Radiology;
