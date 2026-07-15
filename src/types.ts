/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Category {
  ETHICS = '醫學倫理與法律',
  EBM = '實證醫學',
  INFECTION = '感染管制',
  QUALITY = '醫療品質',
  RECORD = '病歷寫作、死亡證明書、疾病診斷書開立',
  TEAM = '跨領域團隊合作照護',
  DISASTER = '災難醫學、動員指揮體系架構及緊急應變',
}

export interface Student {
  id: string;        // 學員代號 / 員工編號
  name: string;      // 學員姓名
  hireDate: string;  // 到職日 (YYYY-MM-DD)
}

export interface CourseRecord {
  id: string;        // 課程紀錄 ID
  studentId: string; // 關聯學員代號
  courseName: string;// 課程名稱
  courseDate: string;// 上課日期 (YYYY-MM-DD)
  category: Category;// 課程學分分類
  hours: number;     // 上課時數
}

export interface CategoryProgress {
  category: Category;
  completedHours: number; // 實際完成時數
  minHours: number;       // 最少應修時數
  maxHours: number;       // 採計上限時數
  cappedHours: number;    // 採計時數 (在 min/max 規範下的有效時數)
  isMet: boolean;         // 是否已達低標
}

export interface PhaseProgress {
  phase: 'PGY1' | 'PGY2';
  requiredTotalHours: number;  // 階段總應修時數
  completedTotalHours: number; // 階段總採計時數
  isTotalHoursMet: boolean;    // 總時數是否達標
  categories: CategoryProgress[];
  isAllCategoriesMet: boolean; // 是否所有分類皆達低標
  isFullyQualified: boolean;   // 是否完全符合此階段要求
}

export interface StudentProgress {
  student: Student;
  pgy1: PhaseProgress;
  pgy2: PhaseProgress;
}

// 輔助計算函數：將日期字串轉換為 Date 物件（不因時區影響而跑掉日期，支援 -、/ 與 . 分隔符，並自動忽略時間部分，且支援民國年與純數字格式如 1140715）
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  
  const trimmed = dateStr.trim();
  // 先擷取僅包含日期的前面部分（過濾掉時間、T、Z、空格等，例如 "2025-07-01 12:30:00" -> "2025-07-01"）
  const datePart = trimmed.split(/[\sT]/)[0].trim();
  
  // 將分隔符如 / 或 . 統一置換為 -
  const normalized = datePart.replace(/[\/\.]/g, '-');
  const parts = normalized.split('-');
  
  let year = NaN;
  let month = NaN;
  let day = NaN;

  if (parts.length >= 3) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    // 檢查是否是純數字：7位數（民國年：YYYMMDD）或 8位數（西元年：YYYYMMDD）
    const pureDigits = datePart.replace(/\D/g, '');
    if (pureDigits.length === 7) {
      year = Number(pureDigits.substring(0, 3)) + 1911;
      month = Number(pureDigits.substring(3, 5));
      day = Number(pureDigits.substring(5, 7));
    } else if (pureDigits.length === 8) {
      year = Number(pureDigits.substring(0, 4));
      month = Number(pureDigits.substring(4, 6));
      day = Number(pureDigits.substring(6, 8));
    } else {
      // 備用方案：試著直接用原生 Date 解析
      const fallback = new Date(dateStr);
      if (!isNaN(fallback.getTime())) {
        let yr = fallback.getFullYear();
        if (yr < 1000) yr += 1911;
        return new Date(yr, fallback.getMonth(), fallback.getDate());
      }
      return new Date(NaN);
    }
  }
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date(NaN);
  }
  
  // 如果年份小於 1000，視為民國年 (例如 114)
  if (year < 1000) {
    year += 1911;
  }
  
  // 月份從 0 開始，所以要減 1
  return new Date(year, month - 1, day);
}

// 判斷某課程日期在到職日後的哪一個 PGY 階段
// PGY1: 到職日一年內 (到職日 ~ 到職日往後算一年減一日，例如 2025-07-01 ~ 2026-06-30)
// PGY2: 到職日第二年 (到職日+1年 ~ 到職日往後算兩年減一日，例如 2026-07-01 ~ 2027-06-30)
export function getCoursePGYPhase(hireDateStr: string, courseDateStr: string): 'PGY1' | 'PGY2' | 'OUT_OF_RANGE' {
  const hireDate = parseLocalDate(hireDateStr);
  const courseDate = parseLocalDate(courseDateStr);
  
  if (isNaN(hireDate.getTime()) || isNaN(courseDate.getTime())) {
    return 'OUT_OF_RANGE';
  }

  const pgy1Start = new Date(hireDate);
  const oneYearLater = new Date(hireDate);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const pgy1End = new Date(oneYearLater);
  pgy1End.setDate(pgy1End.getDate() - 1);
  
  const pgy2Start = new Date(oneYearLater);
  const twoYearsLater = new Date(hireDate);
  twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
  const pgy2End = new Date(twoYearsLater);
  pgy2End.setDate(pgy2End.getDate() - 1);
  
  // 將時間調整至 00:00:00 進行日期比對
  pgy1Start.setHours(0, 0, 0, 0);
  pgy1End.setHours(23, 59, 59, 999);
  pgy2Start.setHours(0, 0, 0, 0);
  pgy2End.setHours(23, 59, 59, 999);
  courseDate.setHours(12, 0, 0, 0); // 取中午以防時區微調
  
  const t = courseDate.getTime();
  
  if (t < pgy1Start.getTime()) {
    return 'OUT_OF_RANGE'; // 在到職日之前的課程不採計
  } else if (t <= pgy1End.getTime()) {
    return 'PGY1';
  } else if (t <= pgy2End.getTime()) {
    return 'PGY2';
  } else {
    return 'OUT_OF_RANGE'; // 超過兩年
  }
}

// 計算 PGY1 與 PGY2 的學分完成狀況
export function calculateStudentProgress(student: Student, records: CourseRecord[]): StudentProgress {
  const studentRecords = records.filter(r => r.studentId === student.id);
  
  // 依 PGY 階段分類上課紀錄
  const pgy1Records = studentRecords.filter(r => getCoursePGYPhase(student.hireDate, r.courseDate) === 'PGY1');
  const pgy2Records = studentRecords.filter(r => getCoursePGYPhase(student.hireDate, r.courseDate) === 'PGY2');

  // PGY1 各項分類規則定義
  const pgy1Rules: { [key in Category]: { min: number; max: number } } = {
    [Category.ETHICS]: { min: 2, max: 4 },
    [Category.EBM]: { min: 2, max: 4 },
    [Category.INFECTION]: { min: 2, max: 4 },
    [Category.QUALITY]: { min: 2, max: 4 },
    [Category.RECORD]: { min: 2, max: 3 },
    [Category.TEAM]: { min: 2, max: 3 },
    [Category.DISASTER]: { min: 1, max: 1 },
  };

  // PGY2 各項分類規則定義 (注意：PGY2 僅需完成 3 個分類共 8 小時)
  const pgy2Rules: { [key in Category]?: { min: number; max: number } } = {
    [Category.ETHICS]: { min: 2, max: 4 },
    [Category.QUALITY]: { min: 2, max: 4 },
    [Category.TEAM]: { min: 2, max: 3 },
  };

  // 1. 計算 PGY1 進度
  const pgy1Categories: CategoryProgress[] = Object.keys(pgy1Rules).map((catKey) => {
    const category = catKey as Category;
    const rule = pgy1Rules[category];
    const catRecords = pgy1Records.filter(r => r.category === category);
    const completedHours = catRecords.reduce((sum, r) => sum + r.hours, 0);
    // 學員的學分可以超過，不設採計上限限制
    const cappedHours = completedHours;
    
    return {
      category,
      completedHours,
      minHours: rule.min,
      maxHours: rule.max,
      cappedHours,
      isMet: completedHours >= rule.min,
    };
  });

  const pgy1CompletedTotal = pgy1Categories.reduce((sum, cat) => sum + cat.cappedHours, 0);
  const pgy1IsTotalHoursMet = pgy1CompletedTotal >= 16;
  const pgy1IsAllCategoriesMet = pgy1Categories.every(cat => cat.isMet);
  const pgy1FullyQualified = pgy1IsTotalHoursMet && pgy1IsAllCategoriesMet;

  const pgy1Progress: PhaseProgress = {
    phase: 'PGY1',
    requiredTotalHours: 16,
    completedTotalHours: pgy1CompletedTotal,
    isTotalHoursMet: pgy1IsTotalHoursMet,
    categories: pgy1Categories,
    isAllCategoriesMet: pgy1IsAllCategoriesMet,
    isFullyQualified: pgy1FullyQualified,
  };

  // 2. 計算 PGY2 進度
  const pgy2Categories: CategoryProgress[] = Object.keys(pgy2Rules).map((catKey) => {
    const category = catKey as Category;
    const rule = pgy2Rules[category]!;
    const catRecords = pgy2Records.filter(r => r.category === category);
    const completedHours = catRecords.reduce((sum, r) => sum + r.hours, 0);
    // 學員的學分可以超過，不設採計上限限制
    const cappedHours = completedHours;

    return {
      category,
      completedHours,
      minHours: rule.min,
      maxHours: rule.max,
      cappedHours,
      isMet: completedHours >= rule.min,
    };
  });

  const pgy2CompletedTotal = pgy2Categories.reduce((sum, cat) => sum + cat.cappedHours, 0);
  const pgy2IsTotalHoursMet = pgy2CompletedTotal >= 8;
  const pgy2IsAllCategoriesMet = pgy2Categories.every(cat => cat.isMet);
  const pgy2FullyQualified = pgy2IsTotalHoursMet && pgy2IsAllCategoriesMet;

  const pgy2Progress: PhaseProgress = {
    phase: 'PGY2',
    requiredTotalHours: 8,
    completedTotalHours: pgy2CompletedTotal,
    isTotalHoursMet: pgy2IsTotalHoursMet,
    categories: pgy2Categories,
    isAllCategoriesMet: pgy2IsAllCategoriesMet,
    isFullyQualified: pgy2FullyQualified,
  };

  return {
    student,
    pgy1: pgy1Progress,
    pgy2: pgy2Progress,
  };
}
