import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, FileText, ArrowLeft, Activity } from 'lucide-react';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch patient details
        const fetchPatient = async () => {
            try {
                // In a real app, we would fetch by ID. 
                // For now, we will try to fetch the specific patient or mock it since our API get-all is simple
                const res = await fetch(`http://localhost:5000/api/patients/${id}`); // Assuming we create this endpoint or filter client side

                if (res.ok) {
                    const data = await res.json();
                    setPatient(data);
                } else {
                    // Fallback if endpoint doesn't exist yet, fetch all and find
                    const allRes = await fetch('http://localhost:5000/api/patients');
                    const allData = await allRes.json();
                    const found = allData.find(p => p.id === id);
                    if (found) setPatient(found);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [id]);

    if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
    if (!patient) return <div className="p-8 text-center text-red-500">لم يتم العثور على المريض</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/patients')} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">الملف الطبي للمريض</h1>
            </div>

            {/* Patient Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
                        {patient.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{patient.full_name}</h2>
                            <p className="text-slate-500">ID: {patient.id.slice(0, 8)}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-slate-700">
                                <Phone size={18} className="text-slate-400" />
                                <span dir="ltr">{patient.phone || 'غير مسجل'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700">
                                <MapPin size={18} className="text-slate-400" />
                                <span>{patient.address || 'غير محدد'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700">
                                <User size={18} className="text-slate-400" />
                                <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700">
                                <Calendar size={18} className="text-slate-400" />
                                <span>{patient.dob ? new Date(patient.dob).toLocaleDateString() : 'غير محدد'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center gap-2">
                            <Activity size={18} />
                            تسجيل زيارة جديدة
                        </button>
                    </div>
                </div>
            </div>

            {/* Medical History Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText className="text-blue-500" />
                            سجل الزيارات
                        </h3>
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-slate-400">لا توجد زيارات سابقة لهذا المريض</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">الملاحظات</h3>
                        <textarea className="w-full p-3 border border-slate-200 rounded-lg h-32 text-sm focus:border-blue-500 outline-none" placeholder="إضافة ملاحظات سريعة..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientDetails;
