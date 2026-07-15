/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  BookOpen, 
  ArrowRight,
  Printer,
  ChevronRight,
  Info
} from 'lucide-react';
import { Student, CourseRecord, Category, calculateStudentProgress, parseLocalDate, getCoursePGYPhase } from '../types';

interface StudentDashboardProps {
  students: Student[];
  records: CourseRecord[];
}

export default function StudentDashboard({ students, records }: StudentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // 模糊匹配搜尋結果
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.id.toLowerCase().includes(query)
    );
  }, [searchQuery, students]);

  // 選取的學員基本資料與計算進度
  const activeStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  const progress = useMemo(() => {
    if (!activeStudent) return null;
    return calculateStudentProgress(activeStudent, records);
  }, [activeStudent, records]);

  // 動員計算日期區間 (+1年、+2年)
  const dateRanges = useMemo(() => {
    if (!activeStudent) return null;
    const hire = parseLocalDate(activeStudent.hireDate);
    
    // PGY1 結束日 (到職日 + 1 年 - 1 天)
    const oneYearLater = new Date(hire);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const pgy1End = new Date(oneYearLater);
    pgy1End.setDate(pgy1End.getDate() - 1);

    // PGY2 開始日 (到職日 + 1 年)
    const pgy2Start = new Date(oneYearLater);

    // PGY2 結束日 (到職日 + 2 年 - 1 天)
    const twoYearsLater = new Date(hire);
    twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
    const pgy2End = new Date(twoYearsLater);
    pgy2End.setDate(pgy2End.getDate() - 1);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      pgy1Start: activeStudent.hireDate,
      pgy1End: formatDate(pgy1End),
      pgy2Start: formatDate(pgy2Start),
      pgy2End: formatDate(pgy2End),
    };
  }, [activeStudent]);

  // 過濾出目前選擇學員的所有課程（自動過濾到職日之前的課程）
  const studentRecords = useMemo(() => {
    if (!selectedStudentId || !activeStudent) return [];
    return records
      .filter(r => r.studentId === selectedStudentId)
      .filter(r => {
        const hire = parseLocalDate(activeStudent.hireDate);
        const course = parseLocalDate(r.courseDate);
        if (isNaN(hire.getTime()) || isNaN(course.getTime())) return true;
        hire.setHours(0, 0, 0, 0);
        course.setHours(12, 0, 0, 0);
        return course.getTime() >= hire.getTime();
      })
      .sort((a, b) => b.courseDate.localeCompare(a.courseDate));
  }, [selectedStudentId, activeStudent, records]);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setSearchQuery('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Search Header Card */}
      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-6 md:p-8 text-center max-w-2xl mx-auto space-y-4">
        <p className="text-[#C5A059] uppercase tracking-widest text-xs font-semibold">PGY Credit Portal</p>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-serif italic">
          住院醫師 PGY 應修學分查詢
        </h2>
        <p className="text-sm text-[#888] max-w-md mx-auto">
          請輸入您的「員工代號」或「中文姓名」，即可即時分析到職一年內（PGY1）與第二年（PGY2）的必修學分符合狀況。
        </p>
        
        {/* Search Input Bar */}
        <div className="relative max-w-md mx-auto">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" />
            <input
              id="student-search-input"
              type="text"
              placeholder="搜尋學員代號 (例如: S1001) 或 姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-[#2A2A2A] rounded-2xl text-sm focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] bg-[#1A1A1A] text-white shadow-inner placeholder-[#555]"
            />
          </div>

          {/* Autocomplete Suggestions dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-[#121212] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden z-20 text-left max-h-60 overflow-y-auto animate-fade-in divide-y divide-[#222]">
              {searchResults.map(student => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student.id)}
                  className="w-full px-5 py-3.5 hover:bg-[#1D1D1D] flex justify-between items-center transition-colors text-sm font-medium text-[#E0E0E0] cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-[#1A1A1A] border border-[#2A2A2A] px-2.5 py-1 rounded-lg text-xs font-bold text-[#C5A059]">
                      {student.id}
                    </span>
                    <span className="text-white font-medium">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#888]">
                    <span>到職日: {student.hireDate}</span>
                    <ChevronRight className="w-4 h-4 text-[#C5A059]" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 shadow-2xl z-20 text-[#888] text-xs">
              查無相符學員。請確認輸入或與教學部管理員聯繫。
            </div>
          )}
        </div>

        {/* Quick select helpful buttons */}
        {!selectedStudentId && students.length > 0 && (
          <div className="pt-3">
            <span className="text-xs text-[#666] mr-2">快速查詢示範醫師：</span>
            <div className="inline-flex flex-wrap gap-1.5 justify-center">
              {students.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s.id)}
                  className="text-xs bg-[#1A1A1A] hover:bg-[#252525] border border-[#222] text-[#C5A059] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer font-medium"
                >
                  {s.name} ({s.id})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DASHBOARD BODY (Only shown when a student is selected) */}
      {activeStudent && progress && dateRanges && (
        <div className="space-y-6 animate-fade-in print:space-y-4">
          
          {/* 1. Student Identity Header Card */}
          <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:border-none print:shadow-none print:p-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#1A1A1A] border border-[#C5A059]/40 text-[#C5A059] font-mono text-xs px-2.5 py-1 rounded-lg font-bold">
                  住院醫師 PGY 檔案
                </span>
                <span className="text-xs text-[#666] font-mono">
                  查詢時間: {new Date().toLocaleDateString('zh-TW')}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2 font-serif italic">
                {activeStudent.name} 醫師
                <span className="text-[#C5A059] font-normal text-sm font-mono ml-1">ID: {activeStudent.id}</span>
              </h3>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1.5 text-xs text-[#888] font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#C5A059]" />
                  到職日：{activeStudent.hireDate}
                </span>
                <span className="hidden sm:inline text-[#2A2A2A]">|</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#888]" />
                  PGY1 區間：{dateRanges.pgy1Start} ~ {dateRanges.pgy1End}
                </span>
                <span className="hidden sm:inline text-[#2A2A2A]">|</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#888]" />
                  PGY2 區間：{dateRanges.pgy2Start} ~ {dateRanges.pgy2End}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 w-full md:w-auto flex-shrink-0">
              <button
                onClick={handlePrint}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#C5A059] border border-[#C5A059] px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer print:hidden"
              >
                <Printer className="w-4 h-4" />
                列印審查報表
              </button>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#C5A059] hover:bg-[#b08e4f] text-black px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer print:hidden"
              >
                重設查詢
              </button>
            </div>
          </div>

          {/* 2. PGY1 & PGY2 Stage Summaries Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PGY1 SUMMARY CARD */}
            <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-6 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 -mr-4 -mt-4 bg-[#C5A059] rounded-full -z-10 opacity-5" />
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-semibold text-[#888] tracking-wider uppercase">STAGE 01</span>
                    <h4 className="text-lg font-bold text-white font-serif italic">第一年階段 (PGY1 期間)</h4>
                  </div>
                  {progress.pgy1.isFullyQualified ? (
                    <span className="flex items-center gap-1 bg-[#1A4D2E] text-[#6FCF97] px-3 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      完全合格
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-[#332A15] text-[#C5A059] px-3 py-1 rounded-full text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      修業中 / 未完全達標
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#888] mb-4 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
                  <span>規範：到職一年內需滿 16 小時，且各項分類皆須符合時數下限。</span>
                </div>

                {/* Progress bar and numeric indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-[#888]">已採計總時數</span>
                    <span className="text-white font-mono font-bold text-base">
                      {progress.pgy1.completedTotalHours} <span className="text-xs text-[#666] font-normal">/ 16 小時</span>
                    </span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="h-2.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden border border-[#222]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress.pgy1.isFullyQualified ? 'bg-[#C5A059]' : 'bg-[#C5A059]/80'
                      }`}
                      style={{ width: `${Math.min((progress.pgy1.completedTotalHours / 16) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-medium text-[#888] pt-1">
                    <span>
                      {progress.pgy1.isTotalHoursMet ? (
                        <span className="text-[#6FCF97] font-semibold flex items-center gap-0.5">✓ 總時數達標</span>
                      ) : (
                        <span className="text-[#FF6B6B] font-semibold">⚠ 總時數尚缺 {16 - progress.pgy1.completedTotalHours} 小時</span>
                      )}
                    </span>
                    <span>
                      {progress.pgy1.isAllCategoriesMet ? (
                        <span className="text-[#6FCF97] font-semibold flex items-center gap-0.5">✓ 各科門檻皆過關</span>
                      ) : (
                        <span className="text-[#C5A059] font-semibold">⚠ 尚有未達低標的學分分類</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini visual list checklist of subcategories */}
              <div className="pt-4 border-t border-[#222] space-y-2 text-xs">
                <span className="font-semibold text-white block font-serif italic">各分類低標檢查：</span>
                <div className="grid grid-cols-2 gap-2">
                  {progress.pgy1.categories.map(cat => (
                    <div key={cat.category} className="flex items-center gap-2 bg-[#1A1A1A] p-2 rounded-lg border border-[#222]">
                      {cat.isMet ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#6FCF97] flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0 animate-pulse" />
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-[#E0E0E0] truncate text-[11px]">{cat.category}</p>
                        <p className="text-[10px] text-[#888] font-mono">
                          {cat.completedHours} / {cat.minHours} 小時
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* PGY2 SUMMARY CARD */}
            <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-6 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 -mr-4 -mt-4 bg-[#C5A059] rounded-full -z-10 opacity-5" />
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-semibold text-[#888] tracking-wider uppercase">STAGE 02</span>
                    <h4 className="text-lg font-bold text-white font-serif italic">第二年階段 (PGY2 期間)</h4>
                  </div>
                  {progress.pgy2.isFullyQualified ? (
                    <span className="flex items-center gap-1 bg-[#1A4D2E] text-[#6FCF97] px-3 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      完全合格
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-[#332A15] text-[#C5A059] px-3 py-1 rounded-full text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      修業中 / 未完全達標
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#888] mb-4 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
                  <span>規範：第二年需滿 8 小時，且僅需修習倫理、品質與跨領域 3 大範疇。</span>
                </div>

                {/* Progress bar and numeric indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-[#888]">已採計總時數</span>
                    <span className="text-white font-mono font-bold text-base">
                      {progress.pgy2.completedTotalHours} <span className="text-xs text-[#666] font-normal">/ 8 小時</span>
                    </span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="h-2.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden border border-[#222]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress.pgy2.isFullyQualified ? 'bg-[#C5A059]' : 'bg-[#C5A059]/80'
                      }`}
                      style={{ width: `${Math.min((progress.pgy2.completedTotalHours / 8) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-medium text-[#888] pt-1">
                    <span>
                      {progress.pgy2.isTotalHoursMet ? (
                        <span className="text-[#6FCF97] font-semibold flex items-center gap-0.5">✓ 總時數達標</span>
                      ) : (
                        <span className="text-[#FF6B6B] font-semibold">⚠ 總時數尚缺 {8 - progress.pgy2.completedTotalHours} 小時</span>
                      )}
                    </span>
                    <span>
                      {progress.pgy2.isAllCategoriesMet ? (
                        <span className="text-[#6FCF97] font-semibold flex items-center gap-0.5">✓ 各科門檻皆過關</span>
                      ) : (
                        <span className="text-[#C5A059] font-semibold">⚠ 尚有未達低標的學分分類</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini visual list checklist of subcategories */}
              <div className="pt-4 border-t border-[#222] space-y-2 text-xs">
                <span className="font-semibold text-white block font-serif italic">各分類低標檢查：</span>
                <div className="grid grid-cols-3 gap-2">
                  {progress.pgy2.categories.map(cat => (
                    <div key={cat.category} className="flex items-center gap-2 bg-[#1A1A1A] p-2 rounded-lg border border-[#222]">
                      {cat.isMet ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#6FCF97] flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0 animate-pulse" />
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-[#E0E0E0] truncate text-[11px]">{cat.category}</p>
                        <p className="text-[10px] text-[#888] font-mono">
                          {cat.completedHours} / {cat.minHours}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* 3. Detailed Category Credit Analyzer */}
          <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-6 space-y-6">
            <div>
              <h4 className="text-base font-bold text-white font-serif italic">兩階段必修學分細項統計</h4>
              <p className="text-xs text-[#888]">此表呈現您在各學分分類中的詳細修習狀況、採計上限以及與低標的落差。</p>
            </div>

            {/* Stage Selector Panels tabs */}
            <div className="space-y-6">
              
              {/* PGY1 Breakdown */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-[#C5A059] bg-[#1D1D1D] px-3.5 py-1.5 rounded-lg inline-block border border-[#2A2A2A]">
                  第一年 PGY1 詳細學分統計 (16 小時)
                </h5>
                
                <div className="space-y-4">
                  {progress.pgy1.categories.map(cat => {
                    // 計算百分比
                    const percentToMin = Math.min((cat.completedHours / cat.minHours) * 100, 100);
                    const percentToMax = Math.min((cat.completedHours / cat.maxHours) * 100, 100);
                    
                    return (
                      <div key={cat.category} className="border border-[#222] bg-[#171717] rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div className="space-y-0.5">
                            <span className="text-xs text-[#666] font-mono">必修分類</span>
                            <h6 className="font-semibold text-white text-sm">{cat.category}</h6>
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-[#1A1A1A] border border-[#222] text-[#888] px-2.5 py-1 rounded font-medium">
                              規定：不低於 {cat.minHours} 小時 (建議 {cat.minHours} 至 {cat.maxHours} 小時)
                            </span>
                            
                            {cat.isMet ? (
                              <span className="text-xs bg-[#1A4D2E] text-[#6FCF97] px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                已達標
                              </span>
                            ) : (
                              <span className="text-xs bg-[#3D1A1A] text-[#FF6B6B] px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                尚缺 {cat.minHours - cat.completedHours} 小時
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress slider bar showing both min threshold and max cap */}
                        <div className="space-y-1.5">
                          {/* Label values */}
                          <div className="flex justify-between text-xs font-semibold text-[#888]">
                            <span className="font-mono text-[#888]">
                              實際修習: <strong className="text-white font-bold">{cat.completedHours}</strong> 小時
                            </span>
                            <span className="font-mono text-[#888]">
                              核實採計: <strong className="text-[#C5A059] font-bold">{cat.cappedHours}</strong> 小時 
                              {cat.completedHours > cat.maxHours && <span className="text-[10px] text-[#6FCF97] ml-1">(可超過不設上限)</span>}
                            </span>
                          </div>

                          {/* Progress track with indicator */}
                          <div className="relative h-4 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#222]">
                            {/* Capped Fill */}
                            <div 
                              className="h-full bg-[#C5A059] rounded-full transition-all duration-300"
                              style={{ width: `${percentToMax}%` }}
                            />
                            {/* Overflow Fill (lighter color) */}
                            {cat.completedHours > cat.maxHours && (
                              <div 
                                className="absolute top-0 h-full bg-[#EAEAEA] opacity-20 rounded-full transition-all duration-300"
                                style={{ 
                                  left: `${percentToMax}%`, 
                                  width: `${Math.min(((cat.completedHours - cat.maxHours) / cat.maxHours) * 100, 100 - percentToMax)}%` 
                                }}
                              />
                            )}

                            {/* Center vertical indicator for minimum requirement */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                              style={{ left: `${(cat.minHours / cat.maxHours) * 100}%` }}
                              title={`低標門檻: ${cat.minHours} 小時`}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-[#555] font-medium">
                            <span>0h</span>
                            <span style={{ marginLeft: `${(cat.minHours / cat.maxHours) * 100 - 10}%` }} className="text-[#C5A059] font-bold">
                              ▲ 最低標準 {cat.minHours}h
                            </span>
                            <span>上限 {cat.maxHours}h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PGY2 Breakdown */}
              <div className="space-y-4 pt-6 border-t border-[#222]">
                <h5 className="text-xs font-bold text-[#C5A059] bg-[#1D1D1D] px-3.5 py-1.5 rounded-lg inline-block border border-[#2A2A2A]">
                  第二年 PGY2 詳細學分統計 (8 小時)
                </h5>
                
                <div className="space-y-4">
                  {progress.pgy2.categories.map(cat => {
                    const percentToMax = Math.min((cat.completedHours / cat.maxHours) * 100, 100);
                    
                    return (
                      <div key={cat.category} className="border border-[#222] bg-[#171717] rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div className="space-y-0.5">
                            <span className="text-xs text-[#666] font-mono">必修分類</span>
                            <h6 className="font-semibold text-white text-sm">{cat.category}</h6>
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-[#1A1A1A] border border-[#222] text-[#888] px-2.5 py-1 rounded font-medium">
                              規定：不低於 {cat.minHours} 小時 (建議 {cat.minHours} 至 {cat.maxHours} 小時)
                            </span>
                            
                            {cat.isMet ? (
                              <span className="text-xs bg-[#1A4D2E] text-[#6FCF97] px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                已達標
                              </span>
                            ) : (
                              <span className="text-xs bg-[#3D1A1A] text-[#FF6B6B] px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                尚缺 {cat.minHours - cat.completedHours} 小時
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress slider bar */}
                        <div className="space-y-1.5">
                          {/* Label values */}
                          <div className="flex justify-between text-xs font-semibold text-[#888]">
                            <span className="font-mono text-[#888]">
                              實際修習: <strong className="text-white font-bold">{cat.completedHours}</strong> 小時
                            </span>
                            <span className="font-mono text-[#888]">
                              核實採計: <strong className="text-[#C5A059] font-bold">{cat.cappedHours}</strong> 小時
                              {cat.completedHours > cat.maxHours && <span className="text-[10px] text-[#6FCF97] ml-1">(可超過不設上限)</span>}
                            </span>
                          </div>

                          {/* Progress track */}
                          <div className="relative h-4 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#222]">
                            <div 
                              className="h-full bg-[#C5A059] rounded-full transition-all duration-300"
                              style={{ width: `${percentToMax}%` }}
                            />
                            {cat.completedHours > cat.maxHours && (
                              <div 
                                className="absolute top-0 h-full bg-[#EAEAEA] opacity-20 rounded-full transition-all duration-300"
                                style={{ 
                                  left: `${percentToMax}%`, 
                                  width: `${Math.min(((cat.completedHours - cat.maxHours) / cat.maxHours) * 100, 100 - percentToMax)}%` 
                                }}
                              />
                            )}

                            {/* Min threshold line */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                              style={{ left: `${(cat.minHours / cat.maxHours) * 100}%` }}
                              title={`低標門檻: ${cat.minHours} 小時`}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-[#555] font-medium">
                            <span>0h</span>
                            <span style={{ marginLeft: `${(cat.minHours / cat.maxHours) * 100 - 10}%` }} className="text-[#C5A059] font-bold">
                              ▲ 最低標準 {cat.minHours}h
                            </span>
                            <span>上限 {cat.maxHours}h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* 4. Course Attendance History Logs Portfolio */}
          <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-6 space-y-4 overflow-hidden">
            <div>
              <h4 className="text-base font-bold text-white font-serif italic">個人上課時數審查歷程</h4>
              <p className="text-xs text-[#888]">
                本表依上課日期遞減排序。系統已自動根據到職日期將時數歸類至 PGY1 或 PGY2 學分中。
              </p>
            </div>

            <div className="border border-[#222] rounded-xl overflow-hidden bg-[#151515]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-[#888] font-medium text-xs border-b border-[#222]">
                      <th className="py-3.5 px-6">上課日期</th>
                      <th className="py-3.5 px-6">課程名稱</th>
                      <th className="py-3.5 px-6">學分分類</th>
                      <th className="py-3.5 px-6 text-center">時數</th>
                      <th className="py-3.5 px-6 text-right">採計階段歸屬</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222] text-[#B0B0B0]">
                    {studentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-[#555] text-xs">
                          目前無此學員的上課課程紀錄。
                        </td>
                      </tr>
                    ) : (
                      studentRecords.map(rec => {
                        const phase = getCoursePGYPhase(activeStudent.hireDate, rec.courseDate);
                        return (
                          <tr key={rec.id} className="hover:bg-[#1C1C1C] transition-colors">
                            <td className="py-3.5 px-6 text-[#888] font-mono text-xs">{rec.courseDate}</td>
                            <td className="py-3.5 px-6 text-white font-medium">{rec.courseName}</td>
                            <td className="py-3.5 px-6">
                              <span className="bg-[#1D1D1D] border border-[#2A2A2A] text-[#C5A059] text-xs px-2.5 py-1 rounded-full font-medium">
                                {rec.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-center font-semibold text-white font-mono">{rec.hours} 小時</td>
                            <td className="py-3.5 px-6 text-right">
                              {phase === 'PGY1' ? (
                                <span className="bg-[#1A4D2E] text-[#6FCF97] text-xs px-2.5 py-1 rounded font-bold">
                                  第一年 PGY1
                                </span>
                              ) : phase === 'PGY2' ? (
                                <span className="bg-[#332A15] text-[#C5A059] text-xs px-2.5 py-1 rounded font-bold">
                                  第二年 PGY2
                                </span>
                              ) : (
                                <span className="bg-[#1A1A1A] border border-[#222] text-[#555] text-xs px-2.5 py-1 rounded">
                                  不計入 PGY 學分 (超出時限)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
