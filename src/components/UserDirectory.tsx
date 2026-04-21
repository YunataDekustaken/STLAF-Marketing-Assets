import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Check, 
  X, 
  User as UserIcon, 
  Building2,
  Edit2
} from 'lucide-react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole, Department } from '../types';

interface UserCardProps {
    key?: string;
    user: UserProfile;
    isEditing: boolean;
    editValues: { role: UserRole, department: Department } | null;
    onEdit: (user: UserProfile) => void;
    onCancel: () => void;
    onUpdate: (uid: string) => void;
    onEditValuesChange: (values: { role: UserRole, department: Department }) => void;
}

const UserCard = ({ 
    user, 
    isEditing, 
    editValues, 
    onEdit, 
    onCancel, 
    onUpdate, 
    onEditValuesChange 
}: UserCardProps) => {
    const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';

    return (
      <div className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors rounded-xl p-4 border border-slate-100 flex items-center justify-between group text-slate-900">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden border-2 border-white shadow-sm">
            {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
                <span>{initials}</span>
            )}
          </div>
          
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">{user.displayName}</h4>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-8 px-4">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <select 
                value={editValues?.role}
                onChange={(e) => onEditValuesChange({ ...editValues!, role: e.target.value as UserRole })}
                className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="marketing_supervisor">Supervisor</option>
                <option value="marketing_member">Member</option>
                <option value="department">Department</option>
              </select>
              <select 
                value={editValues?.department}
                onChange={(e) => onEditValuesChange({ ...editValues!, department: e.target.value as Department })}
                className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="Marketing">Marketing</option>
                <option value="Litigation">Litigation</option>
                <option value="Corporate">Corporate</option>
                <option value="HR">HR</option>
                <option value="Accounting">Accounting</option>
                <option value="Operations">Operations</option>
              </select>
              <div className="flex items-center gap-1">
                <button onClick={() => onUpdate(user.uid)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Check size={16} />
                </button>
                <button onClick={onCancel} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-[200px] justify-end">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  user.role === 'marketing_supervisor' 
                    ? 'bg-amber-100 text-amber-700' 
                    : user.role === 'marketing_member'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {user.role === 'marketing_supervisor' ? 'Supervisor' : user.role === 'marketing_member' ? 'Member' : 'Department'}
                </span>
                <span className="text-[11px] font-medium text-slate-400 min-w-[80px] text-right">
                  {user.department}
                </span>
              </div>
              
              <button 
                onClick={() => onEdit(user)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    );
};

export const UserDirectory = ({ addNotification }: { 
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void 
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ role: UserRole, department: Department } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const userList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        userList.push(doc.data() as UserProfile);
      });
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      addNotification('Error', 'Failed to load user directory', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (uid: string) => {
    if (!editValues) return;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role: editValues.role,
        department: editValues.department
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...editValues } : u));
      setEditingUserId(null);
      setEditValues(null);
      addNotification('Success', 'User updated successfully', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      addNotification('Error', 'Failed to update user', 'warning');
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const marketingTeam = filteredUsers.filter(u => u.role !== 'department');
  const departments = filteredUsers.filter(u => u.role === 'department');

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="p-8 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-2xl shadow-lg ring-4 ring-slate-900/5">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Directory</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Manage portal access and roles</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-800 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-400 animate-pulse">Scanning archives...</p>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                Marketing Team
                <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{marketingTeam.length}</span>
              </h3>
              <div className="space-y-4">
                {marketingTeam.length > 0 ? (
                    marketingTeam.map(user => (
                        <UserCard 
                            key={user.uid} 
                            user={user}
                            isEditing={editingUserId === user.uid}
                            editValues={editValues}
                            onEdit={(u) => {
                                setEditingUserId(u.uid);
                                setEditValues({ role: u.role, department: u.department });
                            }}
                            onCancel={() => {
                                setEditingUserId(null);
                                setEditValues(null);
                            }}
                            onUpdate={handleUpdateUser}
                            onEditValuesChange={setEditValues}
                        />
                    ))
                ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <UserIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 font-medium">No team members found</p>
                    </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                Departments
                <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{departments.length}</span>
              </h3>
              <div className="space-y-4">
                {departments.length > 0 ? (
                    departments.map(user => (
                        <UserCard 
                            key={user.uid} 
                            user={user}
                            isEditing={editingUserId === user.uid}
                            editValues={editValues}
                            onEdit={(u) => {
                                setEditingUserId(u.uid);
                                setEditValues({ role: u.role, department: u.department });
                            }}
                            onCancel={() => {
                                setEditingUserId(null);
                                setEditValues(null);
                            }}
                            onUpdate={handleUpdateUser}
                            onEditValuesChange={setEditValues}
                        />
                    ))
                ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 font-medium">No department users found</p>
                    </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
