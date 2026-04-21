import React from 'react';
import { Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { RequestItem } from '../types';

export const RequestsView = ({ 
  requests, 
  hasAdminAccess, 
  onStatusChange 
}: { 
  requests: RequestItem[]; 
  hasAdminAccess: boolean; 
  onStatusChange: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'rejected': return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-amber-50 text-amber-600 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Asset Requests</h2>
          <p className="text-sm text-slate-500">Track and manage asset requests from the team.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Requested</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requester</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(request => (
                <motion.tr 
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-900">{request.asset}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                        {request.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{request.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold uppercase tracking-wider">
                      {request.department}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-500">{request.date}</span>
                  </td>
                  <td className="p-4">
                    {hasAdminAccess ? (
                      <div className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <select
                          value={request.status}
                          onChange={(e) => onStatusChange(request.id, e.target.value as 'pending' | 'approved' | 'rejected')}
                          className="pl-1 pr-4 bg-transparent outline-none appearance-none cursor-pointer font-bold capitalize"
                        >
                          <option value="pending" className="text-amber-600 bg-white">Pending</option>
                          <option value="approved" className="text-emerald-600 bg-white">Approved</option>
                          <option value="rejected" className="text-rose-600 bg-white">Rejected</option>
                        </select>
                        <div className="absolute right-2 pointer-events-none">
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
