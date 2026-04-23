import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  Shield, 
  User, 
  Users, 
  Loader2,
  Mail,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  where,
  updateDoc
} from 'firebase/firestore';
import { UserRole, UserProfile } from '../types';

interface RoleAssignment {
  id: string;
  email: string;
  role: UserRole;
  department: string;
  assignedAt: any;
}

export const RoleManager = ({ addNotification }: { addNotification: any }) => {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('marketing_member');
  const [department, setDepartment] = useState('Marketing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 1. Fetch pre-registered assignments
    const q1 = query(collection(db, 'roleAssignments'), orderBy('email', 'asc'));
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RoleAssignment[];
      setAssignments(data);
      setLoading(false);
    });

    // 2. Fetch pending users
    const q2 = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as any as UserProfile[];
      setPendingUsers(data);
      setPendingLoading(false);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  const handleApproveUser = async (uid: string, userEmail: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'active'
      });
      addNotification('User Approved', `${userEmail} has been granted access.`, 'success');
    } catch (err: any) {
      addNotification('Error', `Failed to approve user: ${err.message}`, 'warning');
    }
  };

  const handleRejectUser = async (uid: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to reject and delete the account for ${userEmail}?`)) return;
    try {
      // For rejection, we just delete the profile. The user won't be able to log in without a profile being pending again.
      await deleteDoc(doc(db, 'users', uid));
      addNotification('User Rejected', `${userEmail} request was denied.`, 'info');
    } catch (err: any) {
      addNotification('Error', `Failed to reject user: ${err.message}`, 'warning');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'roleAssignments'), {
        email: email.toLowerCase().trim(),
        role,
        department,
        assignedAt: serverTimestamp()
      });
      
      addNotification('User Registered', `${email} has been assigned the ${role} role.`, 'success');
      setEmail('');
      setIsAdding(false);
    } catch (err: any) {
      addNotification('Error', `Failed to register user: ${err.message}`, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove the role assignment for ${userEmail}?`)) return;
    
    try {
      await deleteDoc(doc(db, 'roleAssignments', id));
      addNotification('Assignment Removed', `Role assignment for ${userEmail} deleted.`, 'info');
    } catch (err: any) {
      addNotification('Error', `Failed to remove assignment: ${err.message}`, 'warning');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'marketing_supervisor': return <Shield className="w-4 h-4 text-amber-500" />;
      case 'marketing_member': return <Users className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-8">
      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-500 rounded-xl">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-900">Pending Account Approvals</h3>
              <p className="text-xs text-amber-700">New users waiting for access to the portal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map(user => (
              <div key={user.uid} className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                    <p className="text-[10px] font-medium text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveUser(user.uid, user.email)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Approve Account"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleRejectUser(user.uid, user.email)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Reject Account"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl">
            <UserPlus className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">User Role Management</h3>
            <p className="text-xs text-slate-500">Register Gmail accounts and pre-assign access levels.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
            isAdding 
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
              : 'bg-amber-500 text-primary-dark hover:bg-amber-600'
          }`}
        >
          {isAdding ? <Plus className="w-4 h-4 rotate-45" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Register New User'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <form onSubmit={handleAdd} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Gmail Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assigned Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="marketing_member">Marketing Member</option>
                    <option value="marketing_supervisor">Marketing Supervisor (Admin)</option>
                    <option value="department">Department Representative</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Department</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Marketing, Sales"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Register User
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</th>
              <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Role</th>
              <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</th>
              <th className="text-right py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 mt-2 font-medium">Loading registered users...</p>
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center bg-slate-50 rounded-2xl mt-4">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-400 font-medium">No users registered yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              assignments.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-4">
                    <p className="text-sm font-bold text-slate-900">{item.email}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(item.role)}
                      <span className="text-xs font-semibold text-slate-600">{getRoleLabel(item.role)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs font-medium text-slate-500 italic">{item.department}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => handleDelete(item.id, item.email)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Remove Registration"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-900">How this works:</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            When a user with a registered Gmail address signs in, the system automatically corrects their role and department to match your settings. 
            <strong> Existing users will have their roles updated on their next login.</strong>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};
