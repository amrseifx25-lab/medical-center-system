import React, { useState, useEffect } from 'react';
import { Users, FileText, DollarSign, Plus, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

const HR = () => {
    // ... existing state ...

    // ... existing useEffects ...

    // ... existing handlers ...

    const handleExportExcel = () => {
        if (payrollSheet.length === 0) return alert('No data to export');

        const data = payrollSheet.map(slip => ({
            'Employee': slip.full_name,
            'Position': slip.position,
            'Basic Salary': parseFloat(slip.basic_salary_snapshot),
            'Calculated Basic': parseFloat(slip.calculated_basic_salary),
            'Total Allowances': parseFloat(slip.total_allowances),
            'Total Deductions': parseFloat(slip.total_deductions),
            'Net Salary': parseFloat(slip.net_salary),
            'Cash Paid': parseFloat(slip.cash_paid || slip.net_salary)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll");
        XLSX.writeFile(wb, `Payroll_${headerMonth}_${headerYear}.xlsx`);
    };

    const handlePrintSlip = (slip) => {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Salary Slip - ${slip.full_name}</title>
                    <style>
                        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .details { margin-bottom: 20px; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        .table th { background-color: #f8f9fa; }
                        .total { font-weight: bold; font-size: 1.2em; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Medical Center - Salary Slip</h2>
                        <p>Period: ${headerMonth}/${headerYear}</p>
                    </div>
                    <div class="details">
                        <p><strong>Employee:</strong> ${slip.full_name}</p>
                        <p><strong>Position:</strong> ${slip.position}</p>
                    </div>
                    
                    <h3>Earnings</h3>
                    <table class="table">
                        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                        <tbody>
                            <tr><td>Basic Salary (Calculated)</td><td>${parseFloat(slip.calculated_basic_salary).toLocaleString()}</td></tr>
                            ${(slip.earnings_details || []).map(e => `<tr><td>${e.name}</td><td>${parseFloat(e.amount).toLocaleString()}</td></tr>`).join('')}
                        </tbody>
                    </table>

                    <h3>Deductions</h3>
                    <table class="table">
                        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                        <tbody>
                            ${(slip.deductions_details || []).map(d => `<tr><td>${d.name}</td><td>${parseFloat(d.amount).toLocaleString()}</td></tr>`).join('')}
                        </tbody>
                    </table>

                    <div class="total">
                        <p>Net Salary: ${parseFloat(slip.net_salary).toLocaleString()} EGP</p>
                    </div>
                    
                    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                        <div>HR Signature</div>
                        <div>Employee Signature</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
    const [activeTab, setActiveTab] = useState('employees');
    const [employees, setEmployees] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        position: '',
        join_date: '',
        basic_salary: '',
        variable_salary: '',
        insurance_salary: ''
    });
    const [attendanceData, setAttendanceData] = useState({});
    const [headerMonth, setHeaderMonth] = useState(new Date().getMonth() + 1);
    const [headerYear, setHeaderYear] = useState(new Date().getFullYear());
    const [payrollSheet, setPayrollSheet] = useState([]);
    const [editingSlip, setEditingSlip] = useState(null); // For modal
    const [accounts, setAccounts] = useState([]);
    const [payrollCodes, setPayrollCodes] = useState([]);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [editingCode, setEditingCode] = useState(null);
    const [modalType, setModalType] = useState('Earning');

    const [departments, setDepartments] = useState([]);
    const [editingEmployee, setEditingEmployee] = useState(null);

    // Fetch Initial Data
    useEffect(() => {
        // Employees
        fetch('http://localhost:5000/api/hr/employees')
            .then(res => res.json())
            .then(setEmployees)
            .catch(console.error);

        // Departments
        fetch('http://localhost:5000/api/hr/departments')
            .then(res => res.json())
            .then(setDepartments)
            .catch(console.error);

        // Accounts (for GL dropdown)
        fetch('http://localhost:5000/api/accounting/accounts')
            .then(res => res.json())
            .then(setAccounts)
            .catch(console.error);

    }, []);

    // Fetch Payroll Codes
    useEffect(() => {
        if (activeTab === 'codes') {
            fetch('http://localhost:5000/api/hr/payroll-codes')
                .then(res => res.json())
                .then(setPayrollCodes)
                .catch(console.error);
        }
    }, [activeTab]);

    // Fetch Payroll Sheet when tab/month changes
    useEffect(() => {
        if (activeTab === 'payroll') {
            fetch(`http://localhost:5000/api/hr/payroll/sheet?month=${headerMonth}&year=${headerYear}`)
                .then(res => res.json())
                .then(setPayrollSheet)
                .catch(console.error);
        }
        if (activeTab === 'attendance') {
            fetch(`http://localhost:5000/api/hr/attendance?month=${headerMonth}&year=${headerYear}`)
                .then(res => res.json())
                .then(data => {
                    const map = {};
                    data.forEach(item => {
                        map[item.employee_id] = item;
                    });
                    setAttendanceData(map);
                })
                .catch(console.error);
        }
    }, [activeTab, headerMonth, headerYear]);

    const handleSaveAttendance = (empId, field, value) => {
        const current = attendanceData[empId] || {};
        let parsedVal = value;

        if (field === 'action_work_on_off') {
            parsedVal = value; // String
        } else {
            parsedVal = parseInt(value) || 0;
        }

        const updated = { ...current, [field]: parsedVal };

        // Optimistic UI update
        setAttendanceData({ ...attendanceData, [empId]: updated });

        // API Call
        fetch('http://localhost:5000/api/hr/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: empId,
                month: headerMonth,
                year: headerYear,
                ...updated
            })
        }).catch(err => console.error("Failed to save attendance", err));
    };

    const calculateDue = (emp) => {
        const data = attendanceData[emp.id] || {};
        const days = (data.days_present || 0) + (data.days_off || 0) + (data.days_holiday || 0);

        const workOnOff = (data.days_work_on_off || 0) + (data.days_work_on_holiday || 0);
        const action = data.action_work_on_off || 'Pay';

        const basic = parseFloat(emp.basic_salary) || 0;
        const perDay = basic / 30;

        let total = perDay * days;
        if (action === 'Pay') {
            total += perDay * workOnOff; // Assuming 1.0 rate for now
        }

        return total.toFixed(2);
    };

    const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

    const validateAttendance = (empId) => {
        const data = attendanceData[empId] || {};
        const total = (data.days_present || 0) + (data.days_off || 0) + (data.days_holiday || 0) +
            (data.days_absent || 0) + (data.days_unpaid || 0);
        const daysInMonth = getDaysInMonth(headerMonth, headerYear);
        return total === daysInMonth;
    };

    const handleCalculatePayroll = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/hr/payroll/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: headerMonth, year: headerYear })
            });
            if (res.ok) {
                alert('Payroll Calculated Successfully');
                // Refresh Sheet
                fetch(`http://localhost:5000/api/hr/payroll/sheet?month=${headerMonth}&year=${headerYear}`)
                    .then(r => r.json())
                    .then(setPayrollSheet);
            } else {
                const err = await res.json();
                alert('Calculation Failed: ' + (err.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleClosePayroll = async () => {
        if (!confirm('Are you sure you want to close payroll for this month? This will post Journal Entries and cannot be undone.')) return;

        try {
            const res = await fetch('http://localhost:5000/api/hr/payroll/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: headerMonth, year: headerYear })
            });
            if (res.ok) {
                alert('Payroll Closed and Posted Successfully');
                // Could refresh or lock UI
            } else {
                const err = await res.json();
                alert('Closing Failed: ' + (err.error || 'Check server logs'));
            }
        } catch (err) {
            console.error(err);
            alert('Server Error during closing');
        }
    };

    const handleDeleteCode = (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
        fetch(`http://localhost:5000/api/hr/payroll-codes/${id}`, { method: 'DELETE' })
            .then(() => {
                setPayrollCodes(payrollCodes.filter(c => c.id !== id));
            });
    };

    const handlePrintFullReport = () => {
        if (payrollSheet.length === 0) return alert('No data to print');

        const windowUrl = window.open('', '', 'width=900,height=700');

        // Aggregation
        const totalBasic = payrollSheet.reduce((sum, s) => sum + parseFloat(s.calculated_basic_salary), 0);
        const totalAllowances = payrollSheet.reduce((sum, s) => sum + parseFloat(s.total_allowances), 0);
        const totalDeductions = payrollSheet.reduce((sum, s) => sum + parseFloat(s.total_deductions), 0);
        const totalNet = payrollSheet.reduce((sum, s) => sum + parseFloat(s.net_salary), 0);

        // Department Breakdown
        const deptGroups = {};
        payrollSheet.forEach(s => {
            const dept = s.department_name || 'Unassigned';
            if (!deptGroups[dept]) deptGroups[dept] = { count: 0, net: 0 };
            deptGroups[dept].count++;
            deptGroups[dept].net += parseFloat(s.net_salary);
        });

        const html = `
            <html>
                <head>
                    <title>Monthly Payroll Report - ${headerMonth}/${headerYear}</title>
                    <style>
                        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #333; }
                        h1, h2, h3 { text-align: center; margin: 10px 0; }
                        .section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 14px; }
                        th { background-color: #f4f4f4; }
                        .total-row { font-weight: bold; background-color: #eee; }
                        .print-btn { display: none; }
                        @media print { .print-btn { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Medical Center - Payroll Report</h1>
                        <h3>Month: ${headerMonth} / ${headerYear}</h3>
                    </div>

                    <div class="section">
                        <h2>1. Monthly Summary (ملخص الشهر)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Total Employees</th>
                                    <th>Total Basic</th>
                                    <th>Total Allowances</th>
                                    <th>Total Deductions</th>
                                    <th>Net Salary</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${payrollSheet.length}</td>
                                    <td>${totalBasic.toLocaleString()}</td>
                                    <td>${totalAllowances.toLocaleString()}</td>
                                    <td>${totalDeductions.toLocaleString()}</td>
                                    <td>${totalNet.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>2. Department Breakdown (توزيع الأقسام)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Employee Count</th>
                                    <th>Total Net Salary</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.keys(deptGroups).map(dept => `
                                    <tr>
                                        <td>${dept}</td>
                                        <td>${deptGroups[dept].count}</td>
                                        <td>${deptGroups[dept].net.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>3. Detailed Payroll Sheet (تفاصيل الرواتب)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Department</th>
                                    <th>Basic</th>
                                    <th>Additions</th>
                                    <th>Deductions</th>
                                    <th>Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payrollSheet.map(s => `
                                    <tr>
                                        <td>${s.full_name}</td>
                                        <td>${s.department_name || '-'}</td>
                                        <td>${parseFloat(s.calculated_basic_salary).toLocaleString()}</td>
                                        <td>${parseFloat(s.total_allowances).toLocaleString()}</td>
                                        <td>${parseFloat(s.total_deductions).toLocaleString()}</td>
                                        <td>${parseFloat(s.net_salary).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <script>window.print();</script>
                </body>
            </html>
        `;

        windowUrl.document.write(html);
        windowUrl.document.close();
    };

    const handleSaveCode = (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            code: form.code.value,
            name: form.name.value,
            type: form.type.value,
            calculation_method: form.calculation_method.value,
            gl_account_id: form.gl_account_id.value || null,
            // department_id: form.department_id.value || null 
        };

        const method = editingCode ? 'PUT' : 'POST';
        const url = editingCode
            ? `http://localhost:5000/api/hr/payroll-codes/${editingCode.id}`
            : 'http://localhost:5000/api/hr/payroll-codes';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(res => res.json()).then(saved => {
            if (editingCode) {
                setPayrollCodes(payrollCodes.map(c => c.id === saved.id ? saved : c));
            } else {
                setPayrollCodes([...payrollCodes, saved]);
            }
            setShowCodeModal(false);
            setEditingCode(null);
        }).catch(console.error);
    };

    const handleSaveEmployee = async () => {
        const method = editingEmployee ? 'PUT' : 'POST';
        const url = editingEmployee
            ? `http://localhost:5000/api/hr/employees/${editingEmployee.id}`
            : 'http://localhost:5000/api/hr/employees';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const saved = await res.json();
                if (editingEmployee) {
                    setEmployees(employees.map(e => e.id === saved.id ? saved : e));
                } else {
                    setEmployees([...employees, saved]);
                }
                setShowAddModal(false);
                setEditingEmployee(null);
                setFormData({
                    full_name: '', position: '', join_date: '',
                    basic_salary: '', variable_salary: '', insurance_salary: '',
                    department_id: ''
                });
            } else {
                alert('Job failed');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openEditEmployee = (emp) => {
        setEditingEmployee(emp);
        setFormData({
            full_name: emp.full_name,
            position: emp.position,
            join_date: emp.join_date ? emp.join_date.split('T')[0] : '',
            basic_salary: emp.basic_salary,
            variable_salary: emp.variable_salary,
            insurance_salary: emp.insurance_salary,
            department_id: emp.department_id || ''
        });
        setShowAddModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">الموارد البشرية وشؤون الموظفين</h1>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 ml-4">
                        <select value={headerMonth} onChange={e => setHeaderMonth(parseInt(e.target.value))} className="bg-transparent font-bold">
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select value={headerYear} onChange={e => setHeaderYear(parseInt(e.target.value))} className="bg-transparent font-bold">
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`px-4 py-2 rounded-lg transition ${activeTab === 'employees' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        الموظفين
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-4 py-2 rounded-lg transition ${activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        الحضور والانصراف
                    </button>
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`px-4 py-2 rounded-lg transition ${activeTab === 'payroll' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        الرواتب (Payroll)
                    </button>
                    <button
                        onClick={() => setActiveTab('codes')}
                        className={`px-4 py-2 rounded-lg transition ${activeTab === 'codes' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        أكواد الرواتب
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-lg transition ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        التقارير
                    </button>
                </div>
            </div>

            {activeTab === 'employees' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Existing Employee Table Code... (omitted for brevity, assume keeps working) */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">قائمة الموظفين</h3>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                        >
                            <Plus size={16} /> إضافة موظف
                        </button>
                    </div>
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="p-4">الاسم</th>
                                <th className="p-4">الوظيفة</th>
                                <th className="p-4">الراتب الأساسي</th>
                                <th className="p-4">الراتب التأميني</th>
                                <th className="p-4">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-t border-slate-100">
                                    <td className="p-4 font-medium">{emp.full_name}</td>
                                    <td className="p-4 text-slate-500">{emp.position}</td>
                                    <td className="p-4">{parseFloat(emp.basic_salary).toLocaleString()} ج.م</td>
                                    <td className="p-4">{parseFloat(emp.insurance_salary).toLocaleString()} ج.م</td>
                                    <td className="p-4">
                                        <button onClick={() => openEditEmployee(emp)} className="text-blue-600 text-sm hover:underline">تعديل</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">سجل الحضور لشهر {headerMonth}/{headerYear}</h3>
                    <table className="w-full text-right text-sm">

                        {/* ... (existing table code) ... */}
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-3">الموظف</th>
                                <th className="p-3">أيام العمل</th>
                                <th className="p-3">أجازات</th>
                                <th className="p-3">أعياد</th>
                                <th className="p-3">غياب</th>
                                <th className="p-3">بدون أجر</th>
                                <th className="p-3 bg-yellow-50">عمل بإجازة</th>
                                <th className="p-3 bg-yellow-50">عمل بعيد</th>
                                <th className="p-3 bg-yellow-50">الإجراء</th>
                                <th className="p-3">إجمالي المستحق</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-t border-slate-100">
                                    <td className="p-3 font-medium">{emp.full_name}</td>
                                    <td className="p-3"><input type="number" className="border w-14 p-1 rounded text-center" placeholder="0" value={attendanceData[emp.id]?.days_present || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_present', e.target.value)} /></td>
                                    <td className="p-3"><input type="number" className="border w-14 p-1 rounded text-center" placeholder="0" value={attendanceData[emp.id]?.days_off || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_off', e.target.value)} /></td>
                                    <td className="p-3"><input type="number" className="border w-14 p-1 rounded text-center" placeholder="0" value={attendanceData[emp.id]?.days_holiday || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_holiday', e.target.value)} /></td>
                                    <td className="p-3"><input type="number" className="border w-14 p-1 rounded text-center bg-red-50" placeholder="0" value={attendanceData[emp.id]?.days_absent || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_absent', e.target.value)} /></td>
                                    <td className="p-3"><input type="number" className="border w-14 p-1 rounded text-center bg-red-50" placeholder="0" value={attendanceData[emp.id]?.days_unpaid || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_unpaid', e.target.value)} /></td>

                                    <td className="p-3 bg-yellow-50"><input type="number" className="border w-14 p-1 rounded text-center" placeholder="0" value={attendanceData[emp.id]?.days_work_on_off || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_work_on_off', e.target.value)} /></td>
                                    <td className="p-3 bg-yellow-50"><input type="number" className="border w-14 p-1 rounded text-center" placeholder="0" value={attendanceData[emp.id]?.days_work_on_holiday || ''} onChange={(e) => handleSaveAttendance(emp.id, 'days_work_on_holiday', e.target.value)} /></td>
                                    <td className="p-3 bg-yellow-50">
                                        <select
                                            className="border p-1 rounded text-sm w-24"
                                            value={attendanceData[emp.id]?.action_work_on_off || 'Pay'}
                                            onChange={(e) => handleSaveAttendance(emp.id, 'action_work_on_off', e.target.value)}
                                        >
                                            <option value="Pay">صرف (Pay)</option>
                                            <option value="Credit">رصيد (Credit)</option>
                                        </select>
                                    </td>

                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-blue-600">{calculateDue(emp)}</span>
                                            {!validateAttendance(emp.id) && (
                                                <span className="text-xs text-red-500 font-bold">
                                                    إجمالي الأيام ≠ {getDaysInMonth(headerMonth, headerYear)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-lg mb-6 text-slate-700">تقارير الرواتب والموارد البشرية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">مسير الرواتب الشهري</h4>
                                    <p className="text-xs text-slate-500">تصدير بيانات الرواتب لجميع الموظفين</p>
                                </div>
                            </div>
                            <button onClick={handleExportExcel} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                                <Download size={18} /> تحميل Excel
                            </button>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                    <Printer size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">قسائم الرواتب (Payslips)</h4>
                                    <p className="text-xs text-slate-500">طباعة قسيمة راتب لكل موظف</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveTab('payroll')} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                                الذهاب للمسير للطباعة
                            </button>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">مجمع الرواتب (تقرير شامل)</h4>
                                    <p className="text-xs text-slate-500">ملخص شهري + توزيع الأقسام</p>
                                </div>
                            </div>
                            <button onClick={handlePrintFullReport} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
                                <Printer size={18} /> طباعة التقرير الشامل
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'codes' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-700">إدارة أكواد الرواتب (Payroll Codes)</h3>
                        <button onClick={() => { setEditingCode(null); setModalType('Earning'); setShowCodeModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Plus size={16} /> إضافة كود
                        </button>
                    </div>
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="p-4">الكود</th>
                                <th className="p-4">الاسم</th>
                                <th className="p-4">النوع</th>
                                <th className="p-4">طريقة الحساب</th>
                                <th className="p-4">حساب الأستاذ (GL)</th>
                                <th className="p-4">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollCodes.map(code => (
                                <tr key={code.id} className="border-t border-slate-100">
                                    <td className="p-4 font-mono text-blue-600">{code.code}</td>
                                    <td className="p-4 font-medium">{code.name}</td>
                                    <td className={`p-4 ${code.type === 'Earning' ? 'text-green-600' : 'text-red-600'}`}>{code.type === 'Earning' ? 'استحقاق' : 'استقطاع'}</td>
                                    <td className="p-4">{code.calculation_method === 'Amount' ? 'مبلغ ثابت' : code.calculation_method === 'Days' ? 'أيام' : 'ساعات'}</td>
                                    <td className="p-4 text-slate-500">{code.gl_account_name || '-'}</td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => { setEditingCode(code); setModalType(code.type); setShowCodeModal(true); }} className="text-blue-600 hover:underline">تعديل</button>
                                        <button onClick={() => handleDeleteCode(code.id)} className="text-red-600 hover:underline">حذف</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'payroll' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-700">مسير الرواتب (Payroll Sheet)</h3>
                        <div className="flex gap-2">
                            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 border border-slate-300">
                                <Download size={16} /> Excel تصدير
                            </button>
                            <button onClick={handleCalculatePayroll} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                إعادة احتساب الرواتب
                            </button>
                            <button onClick={handleClosePayroll} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                إقفال الشهر (Post To GL)
                            </button>
                        </div>
                    </div>

                    {/* Report Summary */}
                    {payrollSheet.length > 0 && (
                        <div className="grid grid-cols-5 gap-4 mb-6">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="text-sm text-slate-500 mb-1">إجمالي الرواتب (Gross)</div>
                                <div className="text-xl font-bold text-slate-800">
                                    {payrollSheet.reduce((sum, s) => sum + parseFloat(s.total_allowances || 0), 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="text-sm text-yellow-700 mb-1">تخفيض المصروف (Exp Red)</div>
                                <div className="text-xl font-bold text-yellow-800">
                                    {payrollSheet.reduce((sum, s) => {
                                        const deds = s.deductions_details || [];
                                        return sum + deds.filter(d => d.gl_type === 'Expense').reduce((dSum, d) => dSum + parseFloat(d.amount), 0);
                                    }, 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-sm text-blue-700 mb-1">صافي التكلفة (Net Exp)</div>
                                <div className="text-xl font-bold text-blue-800">
                                    {(
                                        payrollSheet.reduce((sum, s) => sum + parseFloat(s.total_allowances || 0), 0) -
                                        payrollSheet.reduce((sum, s) => {
                                            const deds = s.deductions_details || [];
                                            return sum + deds.filter(d => d.gl_type === 'Expense').reduce((dSum, d) => dSum + parseFloat(d.amount), 0);
                                        }, 0)
                                    ).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="text-sm text-red-700 mb-1">استقطاعات ذمم (BS Ded)</div>
                                <div className="text-xl font-bold text-red-800">
                                    {payrollSheet.reduce((sum, s) => {
                                        const deds = s.deductions_details || [];
                                        return sum + deds.filter(d => d.gl_type !== 'Expense').reduce((dSum, d) => dSum + parseFloat(d.amount), 0);
                                    }, 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="text-sm text-green-700 mb-1">صافي الصرف (Net Pay)</div>
                                <div className="text-xl font-bold text-green-800">
                                    {payrollSheet.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-3">الموظف</th>
                                    <th className="p-3">الراتب الأساسي (30 يوم)</th>
                                    <th className="p-3">أيام الاستحقاق</th>
                                    <th className="p-3">الراتب المحتسب</th>
                                    <th className="p-3 text-green-600">الإضافات (+)</th>
                                    <th className="p-3 text-red-600">الاستقطاعات (-)</th>
                                    <th className="p-3 font-bold">الصافي</th>
                                    <th className="p-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrollSheet.map(slip => (
                                    <tr key={slip.id} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-3 font-medium">{slip.full_name}<div className="text-xs text-slate-400">{slip.position}</div></td>
                                        <td className="p-3">{parseFloat(slip.basic_salary_snapshot).toLocaleString()}</td>
                                        <td className="p-3 text-center">{slip.payable_days}</td>
                                        <td className="p-3 font-medium">{parseFloat(slip.calculated_basic_salary).toLocaleString()}</td>
                                        <td className="p-3 text-green-600 font-medium">{parseFloat(slip.total_allowances).toLocaleString()}</td>
                                        <td className="p-3 text-red-600 font-medium">{parseFloat(slip.total_deductions).toLocaleString()}</td>
                                        <td className="p-3 font-bold text-lg text-slate-800">{parseFloat(slip.net_salary).toLocaleString()}</td>
                                        <td className="p-3 flex gap-2">
                                            <button className="text-blue-600 hover:underline">التفاصيل</button>
                                            <button onClick={() => handlePrintSlip(slip)} className="text-slate-600 hover:text-slate-900" title="Print Slip">
                                                <Printer size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {payrollSheet.length === 0 && <div className="text-center p-8 text-slate-400">لم يتم احتساب رواتب لهذا الشهر بعد. اضغط على "احتساب الرواتب" للبدء.</div>}
                    </div>
                </div>
            )}

            {/* Modal code preserved/updated... */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">{editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}</h3>
                        <div className="space-y-3">
                            <input placeholder="الاسم" className="w-full p-2 border rounded" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                            <input placeholder="الوظيفة" className="w-full p-2 border rounded" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">تاريخ التعيين</label>
                                    <input type="date" className="w-full p-2 border rounded" value={formData.join_date} onChange={e => setFormData({ ...formData, join_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">القسم</label>
                                    <select className="w-full p-2 border rounded" value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })}>
                                        <option value="">اختر القسم...</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <input type="number" placeholder="الراتب الأساسي" className="w-full p-2 border rounded" value={formData.basic_salary} onChange={e => setFormData({ ...formData, basic_salary: e.target.value })} />
                            <input type="number" placeholder="الراتب المتغير" className="w-full p-2 border rounded" value={formData.variable_salary} onChange={e => setFormData({ ...formData, variable_salary: e.target.value })} />
                            <input type="number" placeholder="الراتب التأميني" className="w-full p-2 border rounded" value={formData.insurance_salary} onChange={e => setFormData({ ...formData, insurance_salary: e.target.value })} />

                            <button onClick={handleSaveEmployee} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">حفظ</button>
                            <button onClick={() => { setShowAddModal(false); setEditingEmployee(null); }} className="w-full text-slate-500 py-2">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Payroll Code Modal */}
            {
                showCodeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-96">
                            <h3 className="text-xl font-bold mb-4">{editingCode ? 'تعديل كود' : 'إضافة كود جديد'}</h3>
                            <form onSubmit={handleSaveCode} className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-1">الكود</label>
                                    <input name="code" defaultValue={editingCode?.code} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">الاسم</label>
                                    <input name="name" defaultValue={editingCode?.name} className="w-full border p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">النوع</label>
                                    <select name="type" defaultValue={editingCode?.type || 'Earning'} className="w-full border p-2 rounded">
                                        <option value="Earning">استحقاق (Earning)</option>
                                        <option value="Deduction">استقطاع (Deduction)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">طريقة الحساب</label>
                                    <select name="calculation_method" defaultValue={editingCode?.calculation_method || 'Amount'} className="w-full border p-2 rounded">
                                        <option value="Amount">مبلغ ثابت (Amount)</option>
                                        <option value="Days">أيام (Days)</option>
                                        <option value="Hours">ساعات (Hours)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">حساب الأستاذ (GL Account)</label>
                                    <select name="gl_account_id" defaultValue={editingCode?.gl_account_id || ''} className="w-full border p-2 rounded">
                                        <option value="">اختر الحساب...</option>
                                        {accounts
                                            .filter(a => {
                                                // Usage: Earnings -> Expense. Deductions -> Expense (Reduction) or Liability/Asset (BS).
                                                const type = editingCode?.type || 'Earning'; // Use form value if controlled, but here we used defaultValue. 
                                                // Better to control the 'type' state.
                                                // But for now, let's just show relevant accounts based on typical usage.
                                                // Actually, simplest is to show All accounts for Deductions, and Expenses for Earnings.
                                                // But since we can't easily access the current 'type' select value without state...
                                                // Let's assume the user knows what they are doing OR add state for 'codeType'.
                                                return true;
                                            })
                                            .sort((a, b) => a.type.localeCompare(b.type)) // Sort by type for easier finding
                                            .map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.code}) - {acc.type}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setShowCodeModal(false)} className="px-4 py-2 text-slate-600">إلغاء</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default HR;
