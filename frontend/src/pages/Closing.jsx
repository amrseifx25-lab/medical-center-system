import React, { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';

const Closing = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClosePeriod = () => {
        if (!confirm('هل أنت متأكد من إغلاق الفترة المالية؟ لا يمكن التراجع عن هذا الإجراء.')) return;
        setIsProcessing(true);
        // Implement API call for closing
        setTimeout(() => {
            setIsProcessing(false);
            alert('تم إغلاق الفترة بنجاح (Simulation)');
        }, 2000);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto mt-10">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 mb-2">إغلاق السنة المالية / الفترة</h1>
                <p className="text-slate-500 mb-8">
                    سيتم ترحيل الأرباح والخسائر إلى بند الأرباح المبقاة وإنشاء قيد إغلاق تلقائي.
                </p>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 text-sm mb-8 text-right">
                    <div className="flex items-center gap-2 font-bold mb-2">
                        <AlertTriangle size={16} /> تنبيه هام:
                    </div>
                    <ul className="list-disc list-inside space-y-1 pr-4">
                        <li>تأكد من مراجعة ميزان المراجعة قبل الإغلاق.</li>
                        <li>لا يمكن تعديل القيود بعد تاريخ الإغلاق.</li>
                        <li>سيتم تصفير حسابات المصروفات والإيرادات.</li>
                    </ul>
                </div>

                <button
                    onClick={handleClosePeriod}
                    disabled={isProcessing}
                    className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition w-full font-bold shadow-lg shadow-red-900/20"
                >
                    {isProcessing ? 'جاري المعالجة...' : 'تأكيد وإغلاق الفترة'}
                </button>
            </div>
        </div>
    );
};

export default Closing;
