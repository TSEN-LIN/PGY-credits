/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Settings, 
  Search, 
  ShieldAlert, 
  Info,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, CourseRecord } from './types';
import { DEFAULT_STUDENTS, DEFAULT_RECORDS } from './mockData';
import AdminPanel from './components/AdminPanel';
import StudentDashboard from './components/StudentDashboard';

export default function App() {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<CourseRecord[]>([]);
  const [isRulesCollapsed, setIsRulesCollapsed] = useState(true);

  // 1. 從 LocalStorage 載入資料，若無則載入預設示範資料
  useEffect(() => {
    const savedStudents = localStorage.getItem('pgy_students');
    const savedRecords = localStorage.getItem('pgy_records');

    if (savedStudents && savedRecords) {
      setStudents(JSON.parse(savedStudents));
      setRecords(JSON.parse(savedRecords));
    } else {
      // 第一次進入，自動載入 Demo 資料
      setStudents(DEFAULT_STUDENTS);
      setRecords(DEFAULT_RECORDS);
      localStorage.setItem('pgy_students', JSON.stringify(DEFAULT_STUDENTS));
      localStorage.setItem('pgy_records', JSON.stringify(DEFAULT_RECORDS));
    }
  }, []);

  // 2. 儲存變更至 LocalStorage
  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    localStorage.setItem('pgy_students', JSON.stringify(newStudents));
  };

  const handleUpdateRecords = (newRecords: CourseRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('pgy_records', JSON.stringify(newRecords));
  };

  // 3. 恢復/重設為 Demo 示範資料
  const handleLoadDemoData = () => {
    setStudents(DEFAULT_STUDENTS);
    setRecords(DEFAULT_RECORDS);
    localStorage.setItem('pgy_students', JSON.stringify(DEFAULT_STUDENTS));
    localStorage.setItem('pgy_records', JSON.stringify(DEFAULT_RECORDS));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans leading-normal antialiased pb-20">
      
      {/* Upper Navigation/Branding Bar */}
      <header className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#2A2A2A] shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shadow-md bg-[#121212]">
                <Stethoscope className="w-5.5 h-5.5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-none sm:text-base font-serif italic">
                  一般醫學基本訓練課程時數查詢
                </h1>
              </div>
            </div>

            {/* Role Switcher Toggle */}
            <div className="flex bg-[#121212] p-1 rounded-xl border border-[#222]">
              <button
                id="view-mode-student"
                onClick={() => setRole('student')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  role === 'student'
                    ? 'bg-[#C5A059] text-[#0A0A0A] shadow-sm font-bold'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                學員查詢端
              </button>
              
              <button
                id="view-mode-admin"
                onClick={() => setRole('admin')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-[#C5A059] text-[#0A0A0A] shadow-sm font-bold'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                管理端後台
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* Rules Briefing Sheet (Always Visible but Collapsible) */}
        <section className="bg-[#121212] rounded-2xl shadow-md border border-[#222] p-5 space-y-3 print:hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#1D1D1D] border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center">
                <Info className="w-4.5 h-4.5" />
              </span>
              <div>
                <h2 className="font-bold text-white text-sm sm:text-base font-serif italic">PGY學分規範快速對照表</h2>
                <p className="text-[10px] text-[#888] sm:text-xs">平台依據二年期醫師畢業後一般醫學訓練計畫修業規範開發</p>
              </div>
            </div>
            <button
              id="toggle-rules-btn"
              onClick={() => setIsRulesCollapsed(!isRulesCollapsed)}
              className="text-xs bg-[#1A1A1A] hover:bg-[#252525] border border-[#2A2A2A] text-[#C5A059] px-4 py-2 rounded-xl transition-all font-semibold cursor-pointer tracking-wider"
            >
              {isRulesCollapsed ? '展開規範說明' : '收合規範說明'}
            </button>
          </div>

          <AnimatePresence>
            {!isRulesCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-4 border-t border-[#222]"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#E0E0E0]">
                  
                  {/* PGY1 Rules Column */}
                  <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-[#C5A059] text-sm font-serif italic">
                      <GraduationCap className="w-4.5 h-4.5 text-[#C5A059]" />
                      PGY1 需修滿 16 小時
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside text-[#B0B0B0] leading-relaxed">
                      <li><strong>醫學倫理與法律：</strong>2 至 4 小時</li>
                      <li><strong>實證醫學：</strong>2 至 4 小時</li>
                      <li><strong>感染管制：</strong>2 至 4 小時</li>
                      <li><strong>醫療品質：</strong>2 至 4 小時</li>
                      <li><strong>病歷寫作、死亡/診斷證明開立：</strong>2 至 3 小時</li>
                      <li><strong>跨領域團隊合作照護：</strong>2 至 3 小時</li>
                      <li><strong>災難醫學與緊急應變：</strong>1 小時</li>
                    </ul>
                  </div>

                  {/* PGY2 Rules Column */}
                  <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-[#C5A059] text-sm font-serif italic">
                      <Layers className="w-4.5 h-4.5 text-[#C5A059]" />
                      PGY2 需修滿 8小時
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside text-[#B0B0B0] leading-relaxed">
                      <li><strong>醫學倫理與法律：</strong>2 至 4 小時</li>
                      <li><strong>醫療品質：</strong>2 至 4 小時</li>
                      <li><strong>跨領域團隊合作照護：</strong>2 至 3 小時</li>
                      <li><span className="text-[#666]">※ 其他分類時數於 PGY2 期間不納入必修統計。</span></li>
                    </ul>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* View Segment (Query Dashboard vs Admin management) */}
        <AnimatePresence mode="wait">
          {role === 'student' ? (
            <motion.div
              key="student-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <StudentDashboard students={students} records={records} />
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <AdminPanel
                students={students}
                records={records}
                onUpdateStudents={handleUpdateStudents}
                onUpdateRecords={handleUpdateRecords}
                onLoadDemoData={handleLoadDemoData}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Hospital Footer */}
      <footer className="mt-20 border-t border-[#222] pt-8 pb-12 text-center text-xs text-[#555] uppercase tracking-widest print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p>© 2026 智慧醫療數位教學中心. All Rights Reserved.</p>
          <p className="text-[10px] text-[#444] tracking-[0.15em]">Medical Education Management System • Confidential & Secure</p>
        </div>
      </footer>

    </div>
  );
}
