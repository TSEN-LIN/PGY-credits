/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, DragEvent, FormEvent } from 'react';
import { 
  Users, 
  BookOpen, 
  Upload, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  FileSpreadsheet, 
  Database,
  Calendar,
  Clock,
  Search,
  UserCheck,
  Tag,
  Copy,
  Check,
  Pencil,
  X,
  Info
} from 'lucide-react';
import { Student, CourseRecord, Category, calculateStudentProgress, parseLocalDate } from '../types';
import { parseImportText } from '../utils/parser';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  students: Student[];
  records: CourseRecord[];
  onUpdateStudents: (students: Student[]) => void;
  onUpdateRecords: (records: CourseRecord[]) => void;
  onLoadDemoData: () => void;
}

export default function AdminPanel({
  students,
  records,
  onUpdateStudents,
  onUpdateRecords,
  onLoadDemoData
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'students' | 'records'>('import');
  
  // Pinned/pasted text for import
  const [pasteText, setPasteText] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Manual Form States
  const [newStudent, setNewStudent] = useState({ id: '', name: '', hireDate: '' });
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState({ id: '', name: '', hireDate: '' });

  const [newRecord, setNewRecord] = useState({
    studentId: '',
    courseName: '',
    courseDate: '',
    category: Category.ETHICS,
    hours: ''
  });
  const [recordFormOpen, setRecordFormOpen] = useState(false);

  // Search/Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordFilterCategory, setRecordFilterCategory] = useState<string>('all');

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '確認',
    isDanger: true,
    onConfirm: () => {}
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = '確認',
    isDanger = true
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmLabel,
      isDanger,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerAlert = (title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      title,
      message
    });
  };

  // CSV Template example
  const csvTemplate = `學員代號,學員姓名,到職日,課程名稱,課程日期,課程分類,時數
S2001,林志強,2025-08-01,臨床倫理與法律實務,2025-09-10,醫學倫理與法律,3
S2001,林志強,2025-08-01,臨床品質與病患安全,2025-10-15,醫療品質,2.5
S2002,陳美玲,2025-12-01,感染控制與傳染病防治,2026-02-14,感染管制,2
S2002,陳美玲,2025-12-01,緊急災難動員演習,2026-04-01,災難醫學、動員指揮體系架構及緊急應變,1`;

  const copyTemplate = () => {
    navigator.clipboard.writeText(csvTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const downloadExcelTemplate = () => {
    // Define headers and mock/sample rows with requested columns
    const data = [
      ['學員代號', '學員姓名', '到職日', '課程名稱', '課程日期', '課程分類', '時數'],
      ['S2001', '林志強', '2025-08-01', '臨床倫理與法律實務', '2025-09-10', '醫學倫理與法律', 3],
      ['S2001', '林志強', '2025-08-01', '臨床品質與病患安全', '2025-10-15', '醫療品質', 2.5],
      ['S2002', '陳美玲', '2025-12-01', '感染控制與傳染病防治', '2026-02-14', '感染管制', 2],
      ['S2002', '陳美玲', '2025-12-01', '緊急災難動員演習', '2026-04-01', '災難醫學、動員指揮體系架構及緊急應變', 1]
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths so it looks nice and readable
    const wscols = [
      { wch: 12 }, // 學員代號
      { wch: 12 }, // 學員姓名
      { wch: 12 }, // 到職日
      { wch: 25 }, // 課程名稱
      { wch: 12 }, // 課程日期
      { wch: 30 }, // 課程分類
      { wch: 8 }   // 時數
    ];
    worksheet['!cols'] = wscols;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '課程時數匯入範例');

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, '一般醫學基本訓練課程時數匯入範例.xlsx');
  };

  // --- Handlers ---
  const handleImport = (textToParse: string) => {
    if (!textToParse.trim()) {
      setImportMessage({ type: 'error', text: '請輸入或貼上要匯入的資料內容。' });
      return;
    }

    try {
      const result = parseImportText(textToParse, students);
      
      // 合併學員
      const updatedStudents = [...students];
      let newStudentsCount = 0;
      result.students.forEach(newS => {
        const existIdx = updatedStudents.findIndex(s => s.id.trim().toLowerCase() === newS.id.trim().toLowerCase());
        if (existIdx >= 0) {
          updatedStudents[existIdx] = newS; // 覆寫
        } else {
          updatedStudents.push(newS);
          newStudentsCount++;
        }
      });

      // 合併課程記錄 (若相同學員與相同課程名稱已存在，則進行更新覆蓋；否則新增，以避免重複)
      const updatedRecords = [...records];
      let updatedRecordsCount = 0;
      let addedRecordsCount = 0;

      result.records.forEach(newR => {
        const existIdx = updatedRecords.findIndex(r => 
          r.studentId.trim().toLowerCase() === newR.studentId.trim().toLowerCase() &&
          r.courseName.trim().toLowerCase() === newR.courseName.trim().toLowerCase() &&
          r.courseDate.trim() === newR.courseDate.trim()
        );
        if (existIdx >= 0) {
          updatedRecords[existIdx] = {
            ...updatedRecords[existIdx],
            courseDate: newR.courseDate,
            category: newR.category,
            hours: newR.hours
          };
          updatedRecordsCount++;
        } else {
          updatedRecords.push(newR);
          addedRecordsCount++;
        }
      });

      onUpdateStudents(updatedStudents);
      onUpdateRecords(updatedRecords);

      let successText = `匯入完成！`;
      if (newStudentsCount > 0 || addedRecordsCount > 0) {
        successText += ` 新增 ${newStudentsCount} 位學員、${addedRecordsCount} 筆新紀錄。`;
      }
      if (updatedRecordsCount > 0) {
        successText += ` 更新 ${updatedRecordsCount} 筆已有課程的日期與時數（已自動去重覆）。`;
      }

      if (result.errors.length > 0) {
        setImportMessage({
          type: 'success',
          text: `部分匯入成功！${successText} 但有部分列解析失敗。`,
          details: result.errors
        });
      } else {
        setImportMessage({
          type: 'success',
          text: successText
        });
        setPasteText('');
      }
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: '匯入解析過程中發生非預期錯誤：' + (err.message || String(err))
      });
    }
  };

  const processFile = (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          const formatDateToLocalString = (d: any): string => {
            if (d instanceof Date) {
              // 1. 判斷是否為時間/時數（年份小於 1970 均視為時間/時數）
              // 這時我們不應做以小時為單位的四捨五入，否則會把分鐘資訊（如 1:30）全部抹除。
              // 我們應計算該 Date 相對於 SheetJS 預設 Epoch 1899-12-30T00:00:00.000Z 的差距。
              if (d.getFullYear() < 1970) {
                const epoch = Date.UTC(1899, 11, 30, 0, 0, 0);
                const diffMs = d.getTime() - epoch;
                // 轉為總分鐘數，並進行四捨五入（修正微小的浮點數誤差）
                const totalMinutes = Math.round(diffMs / 60000);
                if (totalMinutes > 0) {
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  const mmStr = String(minutes).padStart(2, '0');
                  return `${hours}:${mmStr}`;
                }
              }

              // 2. 否則為日期：
              // 避免時區轉換與浮點數微小偏差造成的日期偏差：
              // 先將時間四捨五入到最接近的小時，以修正如 23:59:56 這種微小偏差
              const roundedTime = Math.round(d.getTime() / 3600000) * 3600000;
              const roundedDate = new Date(roundedTime);

              // SheetJS 有時會將 Excel 中的純日期解析為 UTC 00:00:00 的 Date 物件，有時會解析為本地時間 00:00:00。
              // 我們比對 UTC 小時與本地小時，看哪一個更接近午夜（0 點或 24 點），就採用該時區的日期，以保證與 Excel 上的日期完全一致。
              const utcHour = roundedDate.getUTCHours();
              const localHour = roundedDate.getHours();
              
              const utcDist = Math.min(utcHour, 24 - utcHour);
              const localDist = Math.min(localHour, 24 - localHour);
              
              let year: number;
              let month: number;
              let day: number;
              
              if (utcDist < localDist) {
                year = roundedDate.getUTCFullYear();
                month = roundedDate.getUTCMonth() + 1;
                day = roundedDate.getUTCDate();
              } else {
                year = roundedDate.getFullYear();
                month = roundedDate.getMonth() + 1;
                day = roundedDate.getDate();
              }
              
              const yyyy = String(year);
              const mm = String(month).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
            return String(d || '').trim();
          };

          const csvLines = rows.map(row => {
            return row.map(cell => {
              if (cell instanceof Date) {
                return formatDateToLocalString(cell);
              }
              const val = String(cell ?? '').trim();
              if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return val;
            }).join(',');
          }).join('\n');

          handleImport(csvLines);
        } catch (error: any) {
          console.error(error);
          setImportMessage({ 
            type: 'error', 
            text: 'Excel 檔案讀取或解析失敗：' + (error.message || String(error)) 
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleImport(text);
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // --- 手動學員管理 ---
  const handleAddStudent = (e: FormEvent) => {
    e.preventDefault();
    const { id, name, hireDate } = newStudent;
    if (!id.trim() || !name.trim() || !hireDate) {
      triggerAlert('資料未完整', '請填寫所有必要欄位。');
      return;
    }

    if (students.some(s => s.id === id.trim())) {
      triggerAlert('重複的代號', '此學員代號已存在！');
      return;
    }

    const updated = [...students, { id: id.trim(), name: name.trim(), hireDate }];
    onUpdateStudents(updated);
    setNewStudent({ id: '', name: '', hireDate: '' });
    setStudentFormOpen(false);
  };

  const handleDeleteStudent = (studentId: string) => {
    triggerConfirm(
      '刪除學員',
      `確定要刪除此學員嗎？這將同時刪除該學員的所有上課紀錄！`,
      () => {
        const updatedStudents = students.filter(s => s.id !== studentId);
        const updatedRecords = records.filter(r => r.studentId !== studentId);
        onUpdateStudents(updatedStudents);
        onUpdateRecords(updatedRecords);
      }
    );
  };

  const handleStartEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditStudentData({ id: student.id, name: student.name, hireDate: student.hireDate });
  };

  const handleSaveStudentEdit = (e: FormEvent) => {
    e.preventDefault();
    const newIdTrimmed = editStudentData.id.trim();
    if (!newIdTrimmed || !editStudentData.name.trim() || !editStudentData.hireDate) {
      triggerAlert('資料未完整', '學員代號、姓名與到職日皆為必填欄位。');
      return;
    }

    // If ID changed, verify it doesn't collide with another student's ID
    if (newIdTrimmed !== editingStudentId) {
      if (students.some(s => s.id === newIdTrimmed)) {
        triggerAlert('代號衝突', '此學員代號已存在於系統中，請使用其他代號！');
        return;
      }
    }

    // Update students array
    const updatedStudents = students.map(s => {
      if (s.id === editingStudentId) {
        return {
          id: newIdTrimmed,
          name: editStudentData.name.trim(),
          hireDate: editStudentData.hireDate
        };
      }
      return s;
    });

    // If ID changed, update all matching course records
    if (newIdTrimmed !== editingStudentId) {
      const updatedRecords = records.map(r => {
        if (r.studentId === editingStudentId) {
          return { ...r, studentId: newIdTrimmed };
        }
        return r;
      });
      onUpdateRecords(updatedRecords);
    }

    onUpdateStudents(updatedStudents);
    setEditingStudentId(null);
  };

  // --- 手動紀錄管理 ---
  const handleAddRecord = (e: FormEvent) => {
    e.preventDefault();
    const { studentId, courseName, courseDate, category, hours } = newRecord;
    if (!studentId || !courseName.trim() || !courseDate || !hours) {
      triggerAlert('資料未完整', '請填寫所有必要欄位。');
      return;
    }

    const hNum = parseFloat(hours);
    if (isNaN(hNum) || hNum <= 0) {
      triggerAlert('格式錯誤', '時數必須為大於 0 的數字。');
      return;
    }

    // 檢查課程日期不可小於該學員之到職日
    const student = students.find(s => s.id === studentId);
    if (student) {
      const hire = parseLocalDate(student.hireDate);
      const course = parseLocalDate(courseDate);
      if (!isNaN(hire.getTime()) && !isNaN(course.getTime())) {
        hire.setHours(0, 0, 0, 0);
        course.setHours(12, 0, 0, 0);
        if (course.getTime() < hire.getTime()) {
          triggerAlert('日期不合規', `上課日期 (${courseDate}) 小於該學員的到職日 (${student.hireDate})，系統不予儲存。`);
          return;
        }
      }
    }

    const newRec: CourseRecord = {
      id: `rec_manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      studentId,
      courseName: courseName.trim(),
      courseDate,
      category,
      hours: hNum
    };

    onUpdateRecords([...records, newRec]);
    setNewRecord({
      studentId: students[0]?.id || '',
      courseName: '',
      courseDate: '',
      category: Category.ETHICS,
      hours: ''
    });
    setRecordFormOpen(false);
  };

  const handleDeleteRecord = (recordId: string) => {
    triggerConfirm(
      '刪除上課紀錄',
      '確定要刪除這筆上課紀錄嗎？',
      () => {
        onUpdateRecords(records.filter(r => r.id !== recordId));
      }
    );
  };

  // --- Filters ---
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.courseName.toLowerCase().includes(recordSearch.toLowerCase()) || 
      r.studentId.toLowerCase().includes(recordSearch.toLowerCase()) ||
      (students.find(s => s.id === r.studentId)?.name || '').toLowerCase().includes(recordSearch.toLowerCase());
    
    const matchesCategory = recordFilterCategory === 'all' || r.category === recordFilterCategory;
    
    if (!matchesSearch || !matchesCategory) return false;

    // Filter out if course date is before student hire date
    const student = students.find(s => s.id === r.studentId);
    if (student) {
      const hire = parseLocalDate(student.hireDate);
      const course = parseLocalDate(r.courseDate);
      if (!isNaN(hire.getTime()) && !isNaN(course.getTime())) {
        hire.setHours(0, 0, 0, 0);
        course.setHours(12, 0, 0, 0);
        if (course.getTime() < hire.getTime()) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div id="admin-panel" className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
      {/* Admin Header */}
      <div className="bg-[#1A1A1A] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#222]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#C5A059] text-black font-mono text-xs px-2.5 py-0.5 rounded-full font-semibold">
              管理後台
            </span>
            <h2 className="text-xl font-semibold tracking-tight text-white font-serif italic">應修學分資料管理中心</h2>
          </div>
          <p className="text-[#888] text-sm">在這裡匯入、維護全院醫師的到職資訊與課程學分紀錄</p>
        </div>
        <div className="flex gap-2">
          <button 
            id="clear-all-data-btn"
            onClick={() => {
              triggerConfirm(
                '清空所有資料',
                '確定要清空系統中所有的學員名冊與上課紀錄嗎？此動作將清除所有當前資料，且無法復原。',
                () => {
                  onUpdateStudents([]);
                  onUpdateRecords([]);
                  setImportMessage({ type: 'success', text: '已成功清空所有學員及上課紀錄！您現在可以全新匯入您的檔案。' });
                },
                '確認清空',
                true
              );
            }}
            className="flex items-center gap-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/50 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-4.5 h-4.5 text-rose-400" />
            清空所有資料
          </button>
          
          <button 
            id="load-demo-data-btn"
            onClick={() => {
              triggerConfirm(
                '載入示範資料',
                '這將會覆蓋當前資料並載入示範學員紀錄。確定要繼續嗎？',
                () => {
                  onLoadDemoData();
                  setImportMessage({ type: 'success', text: '已成功載入預設示範學員及上課資料！' });
                },
                '確認載入',
                false
              );
            }}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#E0E0E0] border border-[#2A2A2A] hover:border-[#C5A059] px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-[#C5A059]" />
            載入示範資料
          </button>
        </div>
      </div>

      {/* Admin Subtabs */}
      <div className="flex border-b border-[#222] bg-[#161616] px-6">
        <button
          id="tab-import"
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 py-4 px-4 font-medium text-sm transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === 'import' 
              ? 'border-[#C5A059] text-[#C5A059]' 
              : 'border-transparent text-[#888] hover:text-[#E0E0E0]'
          }`}
        >
          <Upload className="w-4 h-4" />
          匯入上課狀況
        </button>
        <button
          id="tab-students"
          onClick={() => {
            setActiveTab('students');
            // 初始化手動表單
            if (students.length > 0 && !newRecord.studentId) {
              setNewRecord(prev => ({ ...prev, studentId: students[0].id }));
            }
          }}
          className={`flex items-center gap-2 py-4 px-4 font-medium text-sm transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === 'students' 
              ? 'border-[#C5A059] text-[#C5A059]' 
              : 'border-transparent text-[#888] hover:text-[#E0E0E0]'
          }`}
        >
          <Users className="w-4 h-4" />
          學員名冊 ({students.length})
        </button>
        <button
          id="tab-records"
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 py-4 px-4 font-medium text-sm transition-all border-b-2 -mb-px cursor-pointer ${
            activeTab === 'records' 
              ? 'border-[#C5A059] text-[#C5A059]' 
              : 'border-transparent text-[#888] hover:text-[#E0E0E0]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          上課紀錄明細 ({records.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        
        {/* PANEL 1: IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Instructions and Templates */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#222]">
                  <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2 font-serif italic">
                    <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" />
                    匯入資料規格說明
                  </h3>
                  <p className="text-xs text-[#888] leading-relaxed mb-4">
                    您可以直接上傳 Excel 試算表檔、CSV/TXT 檔案，或是從 Excel 複製表格直接貼入右側。系統會根據學員代號自動歸檔。<strong>若重複匯入相同學員的相同課程，系統會自動去重覆並更新上課日期與時數。</strong>支援以下兩種格式：
                  </p>
                  
                  <div className="space-y-3">
                    <div className="border-l-2 border-[#C5A059] pl-3 py-1 bg-[#121212] p-2.5 rounded-r-lg shadow-sm">
                      <h4 className="font-medium text-white text-xs mb-1">格式 A（完整欄位）</h4>
                      <p className="text-[10px] text-[#888] mb-1.5 leading-tight">若系統無此學員，將一併新增學員基本資料：</p>
                      <code className="text-[9px] bg-[#1A1A1A] text-[#C5A059] p-1 rounded block font-mono overflow-x-auto whitespace-nowrap border border-[#222]">
                        學員代號, 姓名, 到職日(YYYY-MM-DD), 課程名稱, 上課日期, 分類, 時數
                      </code>
                    </div>

                    <div className="border-l-2 border-amber-600 pl-3 py-1 bg-[#121212] p-2.5 rounded-r-lg shadow-sm">
                      <h4 className="font-medium text-white text-xs mb-1">格式 B（僅上課紀錄）</h4>
                      <p className="text-[10px] text-[#888] mb-1.5 leading-tight">僅匯入上課狀況，該學員必須已存在於名冊中：</p>
                      <code className="text-[9px] bg-[#1A1A1A] text-amber-500 p-1 rounded block font-mono overflow-x-auto whitespace-nowrap border border-[#222]">
                        學員代號, 課程名稱, 上課日期(YYYY-MM-DD), 課程分類, 時數
                      </code>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#222] space-y-2">
                    <h4 className="text-xs font-semibold text-[#E0E0E0] flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#C5A059]" />
                      Excel 範本與欄位範例下載
                    </h4>
                    <p className="text-[11px] text-[#888] leading-tight">
                      欄位依序包含：學員代號、學員姓名、到職日、課程名稱、課程日期、課程分類、時數。
                    </p>
                    <button
                      onClick={downloadExcelTemplate}
                      className="w-full text-xs flex items-center justify-center gap-2 text-black bg-[#C5A059] hover:bg-[#B48F47] px-3 py-2.5 rounded-xl font-semibold transition-colors shadow-sm cursor-pointer mt-1"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      下載 Excel 欄位範例檔 (.xlsx)
                    </button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#222]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-[#E0E0E0]">文字複製範本 (CSV 格式)</span>
                      <button
                        onClick={copyTemplate}
                        className="text-[10px] flex items-center gap-1 text-[#888] hover:text-white transition-colors bg-[#1A1A1A] px-2 py-1 rounded border border-[#2A2A2A] hover:border-[#C5A059] cursor-pointer"
                      >
                        {copiedTemplate ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedTemplate ? '已複製' : '複製格式'}
                      </button>
                    </div>
                    <pre className="text-[10px] bg-[#0A0A0A] text-[#C5A059] p-3 rounded-lg overflow-x-auto font-mono max-h-32 leading-relaxed border border-[#222]">
                      {csvTemplate}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Right Column: File drop or text paste */}
              <div className="lg:col-span-2 space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isDragging 
                      ? 'border-[#C5A059] bg-[#C5A059]/10' 
                      : 'border-[#2A2A2A] hover:border-[#C5A059] bg-[#1A1A1A]/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.txt,.xlsx,.xls"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-[#C5A059] border border-[#2A2A2A] flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">上傳 Excel / CSV / TXT 報表</h4>
                  <p className="text-xs text-[#888] mb-2">點擊或將檔案拖曳至此處進行匯入</p>
                  <span className="text-[10px] bg-[#121212] text-[#888] border border-[#222] px-2.5 py-1 rounded">
                    支援 .xlsx, .xls, .csv, .txt 格式
                  </span>
                </div>

                {/* Paste Area */}
                <div className="bg-[#121212] border border-[#222] rounded-2xl p-5 space-y-3 shadow-sm">
                  <label htmlFor="paste-data-textarea" className="block text-xs font-semibold text-[#888]">
                    或者從 Excel / 試算表直接複製整行表格貼在下方：
                  </label>
                  <textarea
                    id="paste-data-textarea"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="貼上複製的試算表內容...
S1005&#9;林小華&#9;2025-09-01&#9;院內感染管制研習&#9;2025-10-15&#9;感染管制&#9;2.5"
                    className="w-full h-44 p-3 border border-[#2A2A2A] rounded-xl font-mono text-xs focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] bg-[#1A1A1A] text-white placeholder-[#444]"
                  />
                  <div className="flex justify-end">
                    <button
                      id="submit-import-btn"
                      onClick={() => handleImport(pasteText)}
                      className="bg-[#C5A059] hover:bg-[#B48F47] text-black px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-black" />
                      解析並匯入
                    </button>
                  </div>
                </div>

                {/* Feedback Messages */}
                {importMessage && (
                  <div className={`p-4 rounded-xl border ${
                    importMessage.type === 'success' 
                      ? 'bg-emerald-950/30 border-emerald-900 text-emerald-200' 
                      : 'bg-rose-950/30 border-rose-900 text-rose-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {importMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 w-full">
                        <p className="font-medium text-sm">{importMessage.text}</p>
                        {importMessage.details && importMessage.details.length > 0 && (
                          <div className="mt-2 text-xs bg-[#121212] p-3 rounded-lg border border-[#222] max-h-40 overflow-y-auto font-mono space-y-1">
                            <span className="font-semibold block text-[11px] mb-1 text-[#E0E0E0]">匯入警告與錯誤列表：</span>
                            {importMessage.details.map((detail, idx) => (
                              <p key={idx} className="text-rose-400">{detail}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: STUDENT MANAGEMENT */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888]" />
                <input
                  type="text"
                  placeholder="搜尋學員姓名、代號..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] bg-[#1A1A1A] text-white placeholder-[#555]"
                />
              </div>

              <button
                id="open-add-student-form-btn"
                onClick={() => setStudentFormOpen(!studentFormOpen)}
                className="w-full sm:w-auto bg-[#C5A059] hover:bg-[#B48F47] text-black px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                手動新增學員
              </button>
            </div>

            {studentFormOpen && (
              <form onSubmit={handleAddStudent} className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#222] grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fade-in">
                <div className="space-y-1">
                  <label htmlFor="input-new-student-id" className="block text-xs font-semibold text-[#888]">學員代號/員編 *</label>
                  <input
                    id="input-new-student-id"
                    type="text"
                    required
                    placeholder="例如: S1005"
                    value={newStudent.id}
                    onChange={(e) => setNewStudent({...newStudent, id: e.target.value})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="input-new-student-name" className="block text-xs font-semibold text-[#888]">學員姓名 *</label>
                  <input
                    id="input-new-student-name"
                    type="text"
                    required
                    placeholder="例如: 林嘉華"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="input-new-student-hire-date" className="block text-xs font-semibold text-[#888]">到職日期 *</label>
                  <input
                    id="input-new-student-hire-date"
                    type="date"
                    required
                    value={newStudent.hireDate}
                    onChange={(e) => setNewStudent({...newStudent, hireDate: e.target.value})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFormOpen(false)}
                    className="flex-1 bg-[#222] hover:bg-[#333] text-[#888] hover:text-white p-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer border border-[#2A2A2A]"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}

            {/* Students Directory Grid */}
            <div className="border border-[#222] rounded-2xl overflow-hidden shadow-sm bg-[#121212]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-[#888] font-medium text-xs border-b border-[#222]">
                      <th className="py-3 px-6">學員代號</th>
                      <th className="py-3 px-6">姓名</th>
                      <th className="py-3 px-6">到職日</th>
                      <th className="py-3 px-6 text-center">總累計時數</th>
                      <th className="py-3 px-6 text-center">PGY1 學分狀態</th>
                      <th className="py-3 px-6 text-center">PGY2 學分狀態</th>
                      <th className="py-3 px-6 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]/50 text-sm">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#888] text-xs">
                          沒有符合條件的學員，請在左側匯入或手動新增。
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => {
                        const progress = calculateStudentProgress(student, records);
                        const isEditing = editingStudentId === student.id;
                        
                        // Calculate total raw un-capped hours from course records (filtering out those before hire date)
                        const studentRecords = records.filter(r => {
                          if (r.studentId !== student.id) return false;
                          const hire = parseLocalDate(student.hireDate);
                          const course = parseLocalDate(r.courseDate);
                          if (isNaN(hire.getTime()) || isNaN(course.getTime())) return true;
                          hire.setHours(0, 0, 0, 0);
                          course.setHours(12, 0, 0, 0);
                          return course.getTime() >= hire.getTime();
                        });
                        const totalRawHours = studentRecords.reduce((sum, r) => sum + r.hours, 0);

                        if (isEditing) {
                          return (
                            <tr key={student.id} className="bg-[#1D1D1D] border-b border-[#222]">
                              <td className="py-2.5 px-6 font-mono">
                                <input
                                  type="text"
                                  value={editStudentData.id}
                                  onChange={(e) => setEditStudentData({ ...editStudentData, id: e.target.value })}
                                  className="w-full bg-[#121212] text-white px-2 py-1.5 border border-[#333] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                                  placeholder="學員代號"
                                />
                              </td>
                              <td className="py-2.5 px-6">
                                <input
                                  type="text"
                                  value={editStudentData.name}
                                  onChange={(e) => setEditStudentData({ ...editStudentData, name: e.target.value })}
                                  className="w-full bg-[#121212] text-white px-2 py-1.5 border border-[#333] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                                  placeholder="姓名"
                                />
                              </td>
                              <td className="py-2.5 px-6">
                                <input
                                  type="date"
                                  value={editStudentData.hireDate}
                                  onChange={(e) => setEditStudentData({ ...editStudentData, hireDate: e.target.value })}
                                  className="w-full bg-[#121212] text-white px-2 py-1.5 border border-[#333] rounded-xl text-xs focus:outline-none focus:border-[#C5A059]"
                                />
                              </td>
                              <td className="py-2.5 px-6 text-center text-[#555] text-xs">
                                編輯中...
                              </td>
                              <td className="py-2.5 px-6 text-center text-[#555] text-xs">
                                編輯中...
                              </td>
                              <td className="py-2.5 px-6 text-center text-[#555] text-xs">
                                編輯中...
                              </td>
                              <td className="py-2.5 px-6 text-right">
                                <div className="inline-flex gap-1.5 justify-end">
                                  <button
                                    onClick={handleSaveStudentEdit}
                                    className="p-1.5 text-emerald-500 hover:text-emerald-400 rounded-lg hover:bg-[#222] transition-colors inline-flex cursor-pointer"
                                    title="儲存修改"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingStudentId(null)}
                                    className="p-1.5 text-[#888] hover:text-white rounded-lg hover:bg-[#222] transition-colors inline-flex cursor-pointer"
                                    title="取消"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={student.id} className="hover:bg-[#1D1D1D] transition-colors border-b border-[#222]/50">
                            <td className="py-3.5 px-6 font-mono font-semibold text-white">{student.id}</td>
                            <td className="py-3.5 px-6 font-medium text-white">{student.name}</td>
                            <td className="py-3.5 px-6 text-[#888] text-xs flex items-center gap-1.5 mt-2.5">
                              <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                              {student.hireDate}
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <div className="inline-flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] px-2.5 py-1 rounded-xl">
                                <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                                <span className="font-mono text-xs font-semibold text-white">
                                  {totalRawHours} 小時
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                  progress.pgy1.isFullyQualified ? 'bg-emerald-500' : progress.pgy1.completedTotalHours > 0 ? 'bg-amber-500' : 'bg-zinc-700'
                                }`} />
                                <span className="font-mono text-xs text-[#E0E0E0]">
                                  {progress.pgy1.completedTotalHours} / 16 小時
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                  progress.pgy2.isFullyQualified ? 'bg-emerald-500' : progress.pgy2.completedTotalHours > 0 ? 'bg-amber-500' : 'bg-zinc-700'
                                }`} />
                                <span className="font-mono text-xs text-[#E0E0E0]">
                                  {progress.pgy2.completedTotalHours} / 8 小時
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="inline-flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleStartEditStudent(student)}
                                  className="p-1.5 text-[#888] hover:text-[#C5A059] rounded-lg hover:bg-[#1A1A1A] transition-colors inline-flex cursor-pointer"
                                  title="修改學員資料"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="p-1.5 text-[#555] hover:text-rose-500 rounded-lg hover:bg-[#1A1A1A] transition-colors inline-flex cursor-pointer"
                                  title="刪除學員與其所有上課紀錄"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
        )}

        {/* PANEL 3: RECORD MANAGEMENT */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888]" />
                  <input
                    type="text"
                    placeholder="搜尋課程名稱、學員代號/姓名..."
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] bg-[#1A1A1A] text-white placeholder-[#555]"
                  />
                </div>
                
                <select
                  value={recordFilterCategory}
                  onChange={(e) => setRecordFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-[#2A2A2A] rounded-xl text-xs font-medium focus:outline-none focus:border-[#C5A059] bg-[#1A1A1A] text-[#E0E0E0] cursor-pointer"
                >
                  <option value="all">所有學分分類 ({records.length})</option>
                  {Object.values(Category).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button
                id="open-add-record-form-btn"
                disabled={students.length === 0}
                onClick={() => setRecordFormOpen(!recordFormOpen)}
                className={`w-full md:w-auto bg-[#C5A059] hover:bg-[#B48F47] text-black px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                  students.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Plus className="w-4 h-4" />
                手動新增上課紀錄
              </button>
            </div>

            {students.length === 0 && (
              <p className="text-xs text-amber-500 bg-amber-950/20 p-3 rounded-lg border border-amber-900/50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                提醒：系統中無學員資料，請先新增學員，方可新增上課紀錄。
              </p>
            )}

            {recordFormOpen && students.length > 0 && (
              <form onSubmit={handleAddRecord} className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#222] grid grid-cols-1 md:grid-cols-5 gap-4 items-end animate-fade-in">
                <div className="space-y-1">
                  <label htmlFor="input-new-rec-student" className="block text-xs font-semibold text-[#888]">對應學員 *</label>
                  <select
                    id="input-new-rec-student"
                    required
                    value={newRecord.studentId || students[0]?.id}
                    onChange={(e) => setNewRecord({...newRecord, studentId: e.target.value})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="input-new-rec-course-name" className="block text-xs font-semibold text-[#888]">課程名稱 *</label>
                  <input
                    id="input-new-rec-course-name"
                    type="text"
                    required
                    placeholder="如: 醫學倫理實務"
                    value={newRecord.courseName}
                    onChange={(e) => setNewRecord({...newRecord, courseName: e.target.value})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="input-new-rec-date" className="block text-xs font-semibold text-[#888]">上課日期 *</label>
                  <input
                    id="input-new-rec-date"
                    type="date"
                    required
                    value={newRecord.courseDate}
                    onChange={(e) => setNewRecord({...newRecord, courseDate: e.target.value})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="input-new-rec-category" className="block text-xs font-semibold text-[#888]">學分分類 *</label>
                  <select
                    id="input-new-rec-category"
                    required
                    value={newRecord.category}
                    onChange={(e) => setNewRecord({...newRecord, category: e.target.value as Category})}
                    className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                  >
                    {Object.values(Category).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="input-new-rec-hours" className="block text-xs font-semibold text-[#888]">時數 *</label>
                    <input
                      id="input-new-rec-hours"
                      type="number"
                      step="0.1"
                      required
                      placeholder="如: 2"
                      value={newRecord.hours}
                      onChange={(e) => setNewRecord({...newRecord, hours: e.target.value})}
                      className="w-full bg-[#121212] text-white p-2 border border-[#2A2A2A] rounded-xl text-sm focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                  <div className="flex gap-1 items-end h-full">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold h-[38px] transition-colors cursor-pointer"
                    >
                      儲存
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordFormOpen(false)}
                      className="flex-1 bg-[#222] hover:bg-[#333] text-[#888] hover:text-white p-2 rounded-xl text-xs font-bold h-[38px] transition-colors cursor-pointer border border-[#2A2A2A]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Records Details Table */}
            <div className="border border-[#222] rounded-2xl overflow-hidden shadow-sm bg-[#121212]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-[#888] font-medium text-xs border-b border-[#222]">
                      <th className="py-3 px-6">學員</th>
                      <th className="py-3 px-6">課程名稱</th>
                      <th className="py-3 px-6">上課日期</th>
                      <th className="py-3 px-6">學分分類</th>
                      <th className="py-3 px-6 text-center">上課時數</th>
                      <th className="py-3 px-6 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]/50 text-sm">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#888] text-xs">
                          沒有符合條件的上課紀錄。
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map(record => {
                        const s = students.find(student => student.id === record.studentId);
                        return (
                          <tr key={record.id} className="hover:bg-[#1D1D1D] transition-colors border-b border-[#222]/50">
                            <td className="py-3.5 px-6 font-semibold text-white">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs">{record.studentId}</span>
                                <span className="text-xs text-[#888] font-normal">{s ? s.name : '未知學員'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 font-medium text-white max-w-xs truncate" title={record.courseName}>
                              {record.courseName}
                            </td>
                            <td className="py-3.5 px-6 text-[#888] text-xs font-mono">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                                {record.courseDate}
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/20 px-2.5 py-1 rounded-full">
                                <Tag className="w-3 h-3 text-[#C5A059]" />
                                {record.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-center font-mono text-white font-semibold">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                                {record.hours}
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1.5 text-[#555] hover:text-rose-500 rounded-lg hover:bg-[#1A1A1A] transition-colors inline-flex cursor-pointer"
                                title="刪除此紀錄"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  confirmModal.isDanger 
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                    : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif">{confirmModal.title}</h3>
                  <p className="text-xs text-[#888] mt-1">{confirmModal.message}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold text-[#888] hover:text-white bg-[#222] hover:bg-[#333] border border-[#2A2A2A] rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                    confirmModal.isDanger 
                      ? 'text-white bg-rose-600 hover:bg-rose-700' 
                      : 'text-black bg-[#C5A059] hover:bg-[#B48F47]'
                  }`}
                >
                  {confirmModal.confirmLabel || '確認'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Modal */}
        {alertModal.isOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center flex-shrink-0 border border-[#C5A059]/20">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif">{alertModal.title}</h3>
                  <p className="text-xs text-[#888] mt-1">{alertModal.message}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-semibold text-black bg-[#C5A059] hover:bg-[#B48F47] rounded-xl transition-colors cursor-pointer"
                >
                  好
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
