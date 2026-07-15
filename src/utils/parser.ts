/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, CourseRecord, Category, parseLocalDate } from '../types';

// 嚴格分類對應：只依據使用者輸入的類別名稱進行精準比對，避免用關鍵字模糊判斷導致誤判
export function mapCategoryByKeyword(text: string): Category | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  // 去除可能的序號前綴，如 "1. 醫學倫理與法律" -> "醫學倫理與法律"
  const cleaned = t.replace(/^[\d\.\s、\-a-z]+/gi, '').trim();

  // 1. 優先：嘗試與 Category 的 value（中文全名）進行完全比對（不分大小寫、前後空白）
  for (const cat of Object.values(Category)) {
    if (cleaned === cat.toLowerCase() || t === cat.toLowerCase()) return cat;
  }

  // 2. 次之：嘗試與 Category 的 key（例如 'ethics', 'ebm'）進行完全比對
  for (const key of Object.keys(Category)) {
    if (cleaned === key.toLowerCase() || t === key.toLowerCase()) {
      return Category[key as keyof typeof Category];
    }
  }

  // 3. 再次：常見學分標準簡稱/別名之「完全比對」（不可使用模糊 includes 包含，避免誤判，如「一般醫學」誤判為「實證醫學」或「醫學倫理」）
  const strictAliasMap: { [key: string]: Category } = {
    '醫學倫理與法律': Category.ETHICS,
    '醫學倫理': Category.ETHICS,
    '倫理': Category.ETHICS,
    '倫理法律': Category.ETHICS,
    'ethics': Category.ETHICS,

    '實證醫學': Category.EBM,
    '實證': Category.EBM,
    'ebm': Category.EBM,

    '感染管制': Category.INFECTION,
    '感控': Category.INFECTION,
    '感染': Category.INFECTION,
    'infection': Category.INFECTION,

    '醫療品質': Category.QUALITY,
    '醫療品質與病人安全': Category.QUALITY,
    '品質': Category.QUALITY,
    'quality': Category.QUALITY,

    '病歷寫作、死亡證明書、疾病診斷書開立': Category.RECORD,
    '病歷寫作': Category.RECORD,
    '病歷': Category.RECORD,
    'record': Category.RECORD,

    '跨領域團隊合作照護': Category.TEAM,
    '跨領域': Category.TEAM,
    '團隊合作': Category.TEAM,
    'team': Category.TEAM,

    '災難醫學、動員指揮體系架構及緊急應變': Category.DISASTER,
    '災難醫學': Category.DISASTER,
    '災難': Category.DISASTER,
    'disaster': Category.DISASTER,
  };

  if (strictAliasMap[cleaned]) {
    return strictAliasMap[cleaned];
  }
  if (strictAliasMap[t]) {
    return strictAliasMap[t];
  }

  return null;
}

// 智慧型解析時數，支援 "3:00"、"2:30" 等冒號時間格式，與純整數或浮點數字串
export function parseHoursString(hoursStr: string): number {
  const trimmed = hoursStr.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1] || '0');
    if (!isNaN(h) && !isNaN(m)) {
      return h + m / 60;
    }
  }
  // 如果字串尾部有「小時」或「h」，先去除之以便 parseFloat
  const cleaned = trimmed.replace(/小時|小時/g, '').replace(/h/gi, '').trim();
  const res = parseFloat(cleaned);
  return res;
}

export interface ParseResult {
  students: Student[];
  records: CourseRecord[];
  errors: string[];
}

/**
 * 智慧型解析貼上的資料或 CSV 內容
 * 支援動態欄位對照（不因欄位順序、調換而影響解析）
 */
export function parseImportText(text: string, existingStudents: Student[]): ParseResult {
  const lines = text.split(/\r?\n/);
  const students: Student[] = [];
  const records: CourseRecord[] = [];
  const errors: string[] = [];

  const studentMap = new Map<string, Student>();
  existingStudents.forEach(s => studentMap.set(s.id.trim().toLowerCase(), s));

  // 動態欄位索引（預設為 -1，代表尚未配對到）
  let idIdx = -1;
  let nameIdx = -1;
  let hireDateIdx = -1;
  let courseNameIdx = -1;
  let courseDateIdx = -1;
  let catIdx = -1;
  let hoursIdx = -1;

  let hasHeaders = false;
  let headerLineText = '';
  let lineCount = 0;

  // 第一階段：先掃描前幾列，找出標頭列並建立欄位對應
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const delimiter = line.includes('\t') ? '\t' : ',';
    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

    // 判斷是否為標頭列
    const isHeaderRow = cols.some(col => 
      col.includes('代號') || col.includes('員工編號') || col.includes('姓名') || 
      col.includes('到職') || col.includes('課程') || col.includes('時數') || col.includes('學分')
    );

    if (isHeaderRow) {
      hasHeaders = true;
      headerLineText = line.trim();
      
      // 1. 先找出學員、課程、日期等基本欄位
      cols.forEach((col, idx) => {
        const c = col.toLowerCase();
        if (c.includes('代號') || c.includes('帳號') || c.includes('員工') || c.includes('員編') || c === 'id') {
          idIdx = idx;
        } else if (c.includes('姓名') || c === 'name') {
          nameIdx = idx;
        } else if (c.includes('到職') || c.includes('入職') || c.includes('hire')) {
          hireDateIdx = idx;
        } else if ((c.includes('課程') && c.includes('名稱')) || c === '課名' || (c === '課程' && !c.includes('分類') && !c.includes('日期') && !c.includes('類別'))) {
          courseNameIdx = idx;
        } else if (c.includes('日期') || c.includes('時間') || c === 'date') {
          courseDateIdx = idx;
        }
      });

      // 2. 智慧型分配分類 (Category) 與時數 (Hours)，避免「學分數」與「學分分類」相互覆蓋
      cols.forEach((col, idx) => {
        const c = col.toLowerCase();
        
        const isCategory = c.includes('分類') || c.includes('類別') || c === 'category' || c.includes('學分屬性') || c.includes('學分類型');
        const isHours = c.includes('時數') || c.includes('小時') || c === 'hours' || c.includes('學分數') || c.includes('學分值');

        if (isCategory) {
          catIdx = idx;
        } else if (isHours) {
          hoursIdx = idx;
        }
      });

      // 3. 對純「學分」或「credits」字眼進行二次分配，以防只有單一「學分」欄位
      cols.forEach((col, idx) => {
        const c = col.toLowerCase();
        if (c === '學分' || c === 'credits') {
          if (hoursIdx === -1 && catIdx !== -1) {
            // 如果已有分類欄位，則此「學分」為時數/學分數
            hoursIdx = idx;
          } else if (catIdx === -1 && hoursIdx !== -1) {
            // 如果已有時數欄位，則此「學分」為分類
            catIdx = idx;
          } else if (hoursIdx === -1 && catIdx === -1) {
            // 如果兩者都沒有，預設優先做為時數/學分數
            hoursIdx = idx;
          }
        }
      });

      break; // 找到標頭就停止掃描標頭
    }
  }

  for (const line of lines) {
    lineCount++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const delimiter = trimmed.includes('\t') ? '\t' : ',';
    const cols = trimmed.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

    // 略過標頭列
    if (hasHeaders) {
      if (trimmed === headerLineText) {
        continue;
      }
    } else {
      // 只有在無標頭的舊版模式下，才使用關鍵字完全比對，避免因包含「課程」等字眼而誤判
      const isHeader = cols.some(col => {
        const c = col.toLowerCase();
        return c === '學員代號' || c === '員工編號' || c === '姓名' || c === '到職日' || 
               c === '課程名稱' || c === '課程日期' || c === '課程分類' || c === '上課時數' || c === '學分' ||
               c === 'id' || c === 'name' || c === 'date' || c === 'category' || c === 'hours' || c === 'credits';
      });
      if (isHeader) {
        continue;
      }
    }

    if (hasHeaders) {
      // 依據標頭動態解析
      if (idIdx === -1 || courseNameIdx === -1 || courseDateIdx === -1 || catIdx === -1 || hoursIdx === -1) {
        errors.push(`第 ${lineCount} 列：標頭解析不完全，請確保包含：學員代號、課程名稱、課程日期、課程分類、時數。`);
        continue;
      }

      const id = cols[idIdx];
      const courseName = cols[courseNameIdx];
      const courseDate = cols[courseDateIdx];
      const catStr = cols[catIdx];
      const hoursStr = cols[hoursIdx];

      if (!id || !courseName || !courseDate || !catStr || !hoursStr) {
        errors.push(`第 ${lineCount} 列：欄位「學員代號、課程名稱、課程日期、課程分類、時數」不得為空。`);
        continue;
      }

      // 如果有包含學員姓名和到職日，則自動新增/更新學員
      if (nameIdx !== -1 && hireDateIdx !== -1) {
        const name = cols[nameIdx];
        const hireDate = cols[hireDateIdx];
        if (name && hireDate) {
          const lowerId = id.trim().toLowerCase();
          if (!studentMap.has(lowerId)) {
            const student: Student = { id: id.trim(), name: name.trim(), hireDate: hireDate.trim() };
            studentMap.set(lowerId, student);
            students.push(student);
          }
        }
      }

      const matchedStudent = studentMap.get(id.trim().toLowerCase());
      if (matchedStudent) {
        const hire = parseLocalDate(matchedStudent.hireDate);
        const course = parseLocalDate(courseDate);
        if (!isNaN(hire.getTime()) && !isNaN(course.getTime())) {
          hire.setHours(0, 0, 0, 0);
          course.setHours(12, 0, 0, 0);
          if (course.getTime() < hire.getTime()) {
            errors.push(`第 ${lineCount} 列：課程日期 (${courseDate.trim()}) 小於學員「${matchedStudent.name} (${matchedStudent.id})」的到職日 (${matchedStudent.hireDate})，已略過此課程紀錄。`);
            continue;
          }
        }
      }

      const category = mapCategoryByKeyword(catStr);
      if (!category) {
        errors.push(`第 ${lineCount} 列：無法辨識的分類「${catStr}」。`);
        continue;
      }

      const hours = parseHoursString(hoursStr);
      if (isNaN(hours) || hours <= 0) {
        errors.push(`第 ${lineCount} 列：時數「${hoursStr}」必須為大於 0 的數字。`);
        continue;
      }

      records.push({
        id: `rec_${id.trim()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        studentId: id.trim(),
        courseName: courseName.trim(),
        courseDate: courseDate.trim(),
        category,
        hours
      });

    } else {
      // 靜態 fallback（相容舊版預設格式）
      if (cols.length >= 7) {
        const [id, name, hireDate, courseName, courseDate, catStr, hoursStr] = cols;
        if (!id || !name || !hireDate || !courseName || !courseDate || !catStr || !hoursStr) {
          errors.push(`第 ${lineCount} 列：欄位不得為空值。`);
          continue;
        }

        const lowerId = id.trim().toLowerCase();
        if (!studentMap.has(lowerId)) {
          const student: Student = { id: id.trim(), name: name.trim(), hireDate: hireDate.trim() };
          studentMap.set(lowerId, student);
          students.push(student);
        }

        const matchedStudent = studentMap.get(lowerId);
        if (matchedStudent) {
          const hire = parseLocalDate(matchedStudent.hireDate);
          const course = parseLocalDate(courseDate);
          if (!isNaN(hire.getTime()) && !isNaN(course.getTime())) {
            hire.setHours(0, 0, 0, 0);
            course.setHours(12, 0, 0, 0);
            if (course.getTime() < hire.getTime()) {
              errors.push(`第 ${lineCount} 列：課程日期 (${courseDate.trim()}) 小於學員「${matchedStudent.name} (${matchedStudent.id})」的到職日 (${matchedStudent.hireDate})，已略過此課程紀錄。`);
              continue;
            }
          }
        }

        const category = mapCategoryByKeyword(catStr);
        if (!category) {
          errors.push(`第 ${lineCount} 列：無法辨識的分類「${catStr}」。`);
          continue;
        }

        const hours = parseHoursString(hoursStr);
        if (isNaN(hours) || hours <= 0) {
          errors.push(`第 ${lineCount} 列：時數「${hoursStr}」必須為大於 0 的數字。`);
          continue;
        }

        records.push({
          id: `rec_${id.trim()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          studentId: id.trim(),
          courseName: courseName.trim(),
          courseDate: courseDate.trim(),
          category,
          hours
        });

      } else if (cols.length >= 5) {
        const [id, courseName, courseDate, catStr, hoursStr] = cols;
        if (!id || !courseName || !courseDate || !catStr || !hoursStr) {
          errors.push(`第 ${lineCount} 列：欄位不得為空值。`);
          continue;
        }

        const matchedStudent = studentMap.get(id.trim().toLowerCase());
        if (!matchedStudent) {
          errors.push(`第 ${lineCount} 列：系統中查無學員代號「${id}」，請先建立學員或使用完整欄位匯入。`);
          continue;
        }

        if (matchedStudent) {
          const hire = parseLocalDate(matchedStudent.hireDate);
          const course = parseLocalDate(courseDate);
          if (!isNaN(hire.getTime()) && !isNaN(course.getTime())) {
            hire.setHours(0, 0, 0, 0);
            course.setHours(12, 0, 0, 0);
            if (course.getTime() < hire.getTime()) {
              errors.push(`第 ${lineCount} 列：課程日期 (${courseDate.trim()}) 小於學員「${matchedStudent.name} (${matchedStudent.id})」的到職日 (${matchedStudent.hireDate})，已略過此課程紀錄。`);
              continue;
            }
          }
        }

        const category = mapCategoryByKeyword(catStr);
        if (!category) {
          errors.push(`第 ${lineCount} 列：無法辨識的分類「${catStr}」。`);
          continue;
        }

        const hours = parseHoursString(hoursStr);
        if (isNaN(hours) || hours <= 0) {
          errors.push(`第 ${lineCount} 列：時數「${hoursStr}」必須為大於 0 的數字。`);
          continue;
        }

        records.push({
          id: `rec_${id.trim()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          studentId: id.trim(),
          courseName: courseName.trim(),
          courseDate: courseDate.trim(),
          category,
          hours
        });
      } else {
        errors.push(`第 ${lineCount} 列：欄位數量不足（至少需 5 欄或 7 欄）。`);
      }
    }
  }

  return {
    students,
    records,
    errors
  };
}
