import React, { useState, useEffect } from 'react';
import { FlaskConical, Plus, Microscope, AlertCircle } from 'lucide-react';

const Lab = () => {
    const [requests, setRequests] = useState([]);
    const [patients, setPatients] = useState([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [requestResults, setRequestResults] = useState([]);

    // Forms
    const [newRequestData, setNewRequestData] = useState({ patient_id: '', test_type: '' });
    const [newResultData, setNewResultData] = useState({ parameter_name: '', value: '', unit: '', reference_range: '', is_abnormal: false });

    const [reportText, setReportText] = useState('');

    useEffect(() => {
        fetchRequests();
        fetchPatients();
    }, []);

    const fetchRequests = () => {
        fetch('http://localhost:5000/api/lab')
            .then(res => res.json())
            .then(data => setRequests(data))
            .catch(err => console.log('API Error'));
    };

    const fetchPatients = () => {
        fetch('http://localhost:5000/api/patients')
            .then(res => res.json())
            .then(data => setPatients(data))
            .catch(err => console.log('API Error'));
    };

    const fetchResults = (requestId) => {
        fetch(`http://localhost:5000/api/lab/${requestId}/results`)
            .then(res => res.json())
            .then(data => setRequestResults(data))
            .catch(err => console.log('API Error'));
    };

    const fetchReport = (requestId) => {
        fetch(`http://localhost:5000/api/lab/${requestId}`)
            .then(res => res.json())
            .then(data => setReportText(data.result_text || ''))
            .catch(err => console.log('API Error'));
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/lab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRequestData)
            });
            if (res.ok) {
                setShowRequestModal(false);
                fetchRequests();
                setNewRequestData({ patient_id: '', test_type: '' });
            }
        } catch (err) { console.error(err); }
    };

    const handleAddResult = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/lab/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newResultData, request_id: selectedRequest.id })
            });
            if (res.ok) {
                fetchResults(selectedRequest.id);
                setNewResultData({ parameter_name: '', value: '', unit: '', reference_range: '', is_abnormal: false });
            }
        } catch (err) { console.error(err); }
    };

    const handleSaveReport = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/lab/${selectedRequest.id}/report`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result_text: reportText })
            });
            if (res.ok) {
                alert('تم حفظ التقرير بنجاح');
            }
        } catch (err) { console.error(err); }
    };

    const openResultModal = (req) => {
        setSelectedRequest(req);
        fetchResults(req.id);
        fetchReport(req.id);
        setShowResultModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">المختبر والتحاليل (LIS)</h1>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                            <th className="p-4">المريض</th>
                            <th className="p-4">نوع التحليل</th>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                                <td className="p-4 font-medium">{req.patient_name}</td>
                                <td className="p-4 flex items-center gap-2">
                                    <FlaskConical size={16} className="text-purple-500" />
                                    {req.test_type}
                                </td>
                                <td className="p-4 text-slate-500" dir="ltr">{new Date(req.requested_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs ${req.result_count > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {req.result_count > 0 ? 'مكتمل' : 'قيد الانتظار'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => openResultModal(req)}
                                        className="text-purple-600 hover:underline text-sm font-medium flex items-center gap-1"
                                    >
                                        <Microscope size={16} /> إدخال النتائج
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>



            {/* Results Modal */}
            {showResultModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-2xl h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4">نتائج التحليل - {selectedRequest?.test_type}</h3>

                        {/* Existing Results List */}
                        <div className="mb-6 bg-slate-50 p-4 rounded-lg">
                            <h4 className="font-medium text-sm text-slate-700 mb-3">النتائج المسجلة:</h4>
                            {requestResults.length === 0 ? (
                                <p className="text-sm text-slate-400">لا توجد نتائج مسجلة بعد.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-500 border-b">
                                            <th className="pb-2 text-right">المؤشر</th>
                                            <th className="pb-2 text-right">القيمة</th>
                                            <th className="pb-2 text-right">الوحدة</th>
                                            <th className="pb-2 text-right">المعدل الطبيعي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requestResults.map(res => (
                                            <tr key={res.id} className="border-b border-slate-100">
                                                <td className="py-2 font-medium">{res.parameter_name}</td>
                                                <td className={`py-2 ${res.is_abnormal ? 'text-red-600 font-bold' : ''}`}>
                                                    {res.value} {res.is_abnormal && <AlertCircle size={12} className="inline mr-1" />}
                                                </td>
                                                <td className="py-2 text-slate-500">{res.unit}</td>
                                                <td className="py-2 text-slate-500" dir="ltr">{res.reference_range}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Report Text Area */}
                        <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
                            <h4 className="font-medium text-sm text-slate-700 mb-2">تقرير الطبيب / ملاحظات:</h4>
                            <textarea
                                className="w-full p-3 border rounded-lg font-mono text-sm leading-relaxed"
                                rows="4"
                                placeholder="اكتب تقرير التحليل هنا..."
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                            ></textarea>
                            <div className="mt-2 text-left">
                                <button
                                    onClick={handleSaveReport}
                                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                                >
                                    حفظ التقرير
                                </button>
                            </div>
                        </div>

                        {/* Add New Result Form */}
                        <form onSubmit={handleAddResult} className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h4 className="font-medium text-sm text-purple-800 mb-3">إضافة نتيجة رقمية جديدة</h4>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <input
                                    placeholder="اسم المؤشر (مثال: Hemoglobin)"
                                    className="p-2 border rounded"
                                    value={newResultData.parameter_name}
                                    onChange={e => setNewResultData({ ...newResultData, parameter_name: e.target.value })}
                                    required
                                />
                                <input
                                    placeholder="القيمة"
                                    className="p-2 border rounded"
                                    value={newResultData.value}
                                    onChange={e => setNewResultData({ ...newResultData, value: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <input
                                    placeholder="الوحدة (g/dL)"
                                    className="p-2 border rounded"
                                    value={newResultData.unit}
                                    onChange={e => setNewResultData({ ...newResultData, unit: e.target.value })}
                                />
                                <input
                                    placeholder="المعدل الطبيعي (12-16)"
                                    className="p-2 border rounded"
                                    value={newResultData.reference_range}
                                    onChange={e => setNewResultData({ ...newResultData, reference_range: e.target.value })}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newResultData.is_abnormal}
                                        onChange={e => setNewResultData({ ...newResultData, is_abnormal: e.target.checked })}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    <span className="text-sm text-slate-700">تحديد كنتيجة غير طبيعية (Abnormal)</span>
                                </label>
                            </div>
                            <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">إضافة النتيجة</button>
                        </form>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowResultModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lab;
