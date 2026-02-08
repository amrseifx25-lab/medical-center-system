import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, User, FileText, Filter } from 'lucide-react';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [filters, setFilters] = useState({ gender: '' });
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        gender: 'male',
        dob: '',
        address: ''
    });

    // Fetch patients (Mock data for now if API fails)
    useEffect(() => {
        fetch('http://localhost:5000/api/patients')
            .then(res => res.json())
            .then(data => setPatients(data))
            .catch(err => {
                console.log('API Error, using mock data');
                setPatients([
                    { id: 1, full_name: 'أحمد علي', phone: '01012345678', gender: 'male', last_visit: '2023-10-01' },
                    { id: 2, full_name: 'سارة محمد', phone: '01198765432', gender: 'female', last_visit: '2023-10-05' },
                ]);
            });
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Name Validation: At least 2 words
        const nameParts = formData.full_name.trim().split(/\s+/);
        if (nameParts.length < 2) {
            alert('يجب إدخال الاسم ثنائي على الأقل (اسم المريض واسم الأب)');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newPatient = await res.json();
                setPatients([newPatient, ...patients]);
                setShowModal(false);
                setFormData({ full_name: '', phone: '', gender: 'male', dob: '', address: '' });
            } else {
                const errData = await res.json();
                alert('حدث خطأ أثناء الحفظ: ' + (errData.message || 'خطأ غير معروف'));
            }
        } catch (err) {
            console.error(err);
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    // Fetch patients (Mock data for now if API fails)

    const filteredPatients = patients.filter(patient => {
        const matchesSearch = patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.phone && patient.phone.includes(searchTerm));

        const matchesGender = filters.gender ? patient.gender === filters.gender : true;

        return matchesSearch && matchesGender;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">إدارة المرضى</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    <span>إضافة مريض</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 gap-4 flex flex-col">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-3 top-3 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث بالاسم أو رقم الهاتف..."
                            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className={`px-4 py-2 rounded-lg transition font-medium border flex items-center gap-2 ${showAdvancedSearch
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        <Filter size={18} />
                        بحث متقدم
                    </button>
                </div>

                {/* Advanced Search Filters */}
                {showAdvancedSearch && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">النوع</label>
                            <select
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                                value={filters.gender}
                            >
                                <option value="">الكل</option>
                                <option value="male">ذكر</option>
                                <option value="female">أنثى</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                        <tr>
                            <th className="p-4">الاسم</th>
                            <th className="p-4">رقم الهاتف</th>
                            <th className="p-4">الجنس</th>
                            <th className="p-4">آخر زيارة</th>
                            <th className="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPatients.length > 0 ? (
                            filteredPatients.map((patient) => (
                                <tr key={patient.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">
                                            <User size={18} />
                                        </div>
                                        <span className="font-medium text-slate-800">{patient.full_name}</span>
                                    </td>
                                    <td className="p-4 text-slate-600 font-mono text-sm" dir="ltr">{patient.phone}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${patient.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                            {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 text-sm">{patient.last_visit || '-'}</td>
                                    <td className="p-4">
                                        <Link to={`/patients/${patient.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium transition-colors">
                                            <FileText size={16} />
                                            الملف الطبي
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">
                                    لا توجد بيانات مطابقة للبحث
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Patient Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">تسجيل مريض جديد</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">الاسم رباعي <span className="text-red-500">*</span></label>
                                <input required name="full_name" value={formData.full_name} onChange={handleChange} type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" placeholder="الاسم كما في البطاقة" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم الهاتف</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" placeholder="01xxxxxxxxx" dir="ltr" />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">تاريخ الميلاد</label>
                                    <input name="dob" value={formData.dob} onChange={handleChange} type="date" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">النوع</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white">
                                        <option value="male">ذكر</option>
                                        <option value="female">أنثى</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">العنوان</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none" rows="3" placeholder="العنوان بالتفصيل..."></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">إلغاء</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95">حفظ البيانات</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Patients;
