import API_BASE_URL from '../../api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trash2, UserPlus, Shield } from 'lucide-react';

const UserManagement = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = () => {
        fetch(API_BASE_URL + '/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(setUsers)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const fetchRoles = () => {
        fetch(API_BASE_URL + '/api/users/roles', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(setRoles)
            .catch(console.error);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetch(API_BASE_URL + '/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to create user');
            })
            .then(newUser => {
                setUsers([...users, { ...newUser, role: formData.role }]);
                setFormData({ username: '', password: '', full_name: '', role: '' });
                alert('User Created Successfully');
            })
            .catch(err => alert(err.message));
    };

    const handleDelete = (id) => {
        if (!window.confirm('Are you sure?')) return;
        fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.ok) {
                    setUsers(users.filter(u => u.id !== id));
                }
            });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="text-blue-600" /> إدارة المستخدمين والصلاحيات
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <UserPlus size={20} /> إضافة مستخدم جديد
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">اسم المستخدم</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">الاسم الكامل</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">كلمة المرور</label>
                            <input
                                type="password"
                                className="w-full p-2 border rounded"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">الدور (Role)</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                required
                            >
                                <option value="">اختر الدور...</option>
                                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                            Create User
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4">قائمة المستخدمين</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="p-3">ID</th>
                                    <th className="p-3">اسم المستخدم</th>
                                    <th className="p-3">الاسم الكامل</th>
                                    <th className="p-3">الدور</th>
                                    <th className="p-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b hover:bg-slate-50">
                                        <td className="p-3">{u.id}</td>
                                        <td className="p-3 font-mono text-sm">{u.username}</td>
                                        <td className="p-3">{u.full_name}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                                {u.role || 'No Role'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {u.username !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
