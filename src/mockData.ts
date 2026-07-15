/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, CourseRecord, Category } from './types';

export const DEFAULT_STUDENTS: Student[] = [
  {
    id: "S1001",
    name: "李明翰",
    hireDate: "2025-07-01"
  },
  {
    id: "S1002",
    name: "陳郁婷",
    hireDate: "2025-10-01"
  },
  {
    id: "S1003",
    name: "張嘉豪",
    hireDate: "2026-03-15"
  },
  {
    id: "S1004",
    name: "王斯哲",
    hireDate: "2024-07-01"
  }
];

export const DEFAULT_RECORDS: CourseRecord[] = [
  // --- S1001 (李明翰, 2025-07-01 到職) PGY1 均已修滿，PGY2 修到一半 ---
  // PGY1 期間: 2025-07-01 ~ 2026-06-30
  {
    id: "rec_1001_1",
    studentId: "S1001",
    courseName: "臨床醫學倫理與法律實務座談會",
    courseDate: "2025-08-12",
    category: Category.ETHICS,
    hours: 3
  },
  {
    id: "rec_1001_2",
    studentId: "S1001",
    courseName: "實證醫學文獻檢索與系統評論工作坊",
    courseDate: "2025-09-05",
    category: Category.EBM,
    hours: 2
  },
  {
    id: "rec_1001_3",
    studentId: "S1001",
    courseName: "院內感染管制與洗手安全衛生講習",
    courseDate: "2025-10-20",
    category: Category.INFECTION,
    hours: 2.5
  },
  {
    id: "rec_1001_4",
    studentId: "S1001",
    courseName: "醫療品質管理及病患安全實踐指引",
    courseDate: "2025-11-15",
    category: Category.QUALITY,
    hours: 3
  },
  {
    id: "rec_1001_5",
    studentId: "S1001",
    courseName: "病歷書寫與法律規範、死亡證明書填寫要領",
    courseDate: "2025-12-08",
    category: Category.RECORD,
    hours: 2
  },
  {
    id: "rec_1001_6",
    studentId: "S1001",
    courseName: "跨領域團隊合作與擬真病患聯合照護演練",
    courseDate: "2026-02-18",
    category: Category.TEAM,
    hours: 3
  },
  {
    id: "rec_1001_7",
    studentId: "S1001",
    courseName: "災難醫學與全院緊急動員應變指揮演習",
    courseDate: "2026-04-10",
    category: Category.DISASTER,
    hours: 1
  },
  {
    id: "rec_1001_8",
    studentId: "S1001",
    courseName: "實證臨床決策應用課程",
    courseDate: "2026-05-12",
    category: Category.EBM,
    hours: 1
  },
  // PGY2 期間: 2026-07-01 ~ 2027-06-30 (已完成部分)
  {
    id: "rec_1001_9",
    studentId: "S1001",
    courseName: "進階醫學倫理思辨與醫療糾紛實務",
    courseDate: "2026-07-02",
    category: Category.ETHICS,
    hours: 3
  },
  {
    id: "rec_1001_10",
    studentId: "S1001",
    courseName: "全院醫療品質指標與根本原因分析(RCA)",
    courseDate: "2026-07-04",
    category: Category.QUALITY,
    hours: 3
  },

  // --- S1002 (陳郁婷, 2025-10-01 到職) PGY1 進行中 (差 災難醫學 1 小時、倫理 1 小時) ---
  // PGY1 期間: 2025-10-01 ~ 2026-09-30 (當前日期是 2026-07-06，尚在 PGY1 期間內)
  {
    id: "rec_1002_1",
    studentId: "S1002",
    courseName: "實務醫療法規要點剖析",
    courseDate: "2025-11-03",
    category: Category.ETHICS,
    hours: 1 // 倫理目前 1 小時，低標 2 小時，未達標
  },
  {
    id: "rec_1002_2",
    studentId: "S1002",
    courseName: "實證醫學概論與文獻讀書會",
    courseDate: "2025-11-20",
    category: Category.EBM,
    hours: 3 // EBM 3 小時，符合 2~4
  },
  {
    id: "rec_1002_3",
    studentId: "S1002",
    courseName: "傳染病防治與隔離防護演練",
    courseDate: "2026-01-15",
    category: Category.INFECTION,
    hours: 3 // 感染管制 3 小時，符合 2~4
  },
  {
    id: "rec_1002_4",
    studentId: "S1002",
    courseName: "臨床病患安全事件分析與通報實務",
    courseDate: "2026-03-10",
    category: Category.QUALITY,
    hours: 2 // 醫療品質 2 小時，符合 2~4
  },
  {
    id: "rec_1002_5",
    studentId: "S1002",
    courseName: "診斷書開立規範與司法鑑定注意事項",
    courseDate: "2026-04-05",
    category: Category.RECORD,
    hours: 2 // 病歷寫作 2 小時，符合 2~3
  },
  {
    id: "rec_1002_6",
    studentId: "S1002",
    courseName: "跨專業溝通與團隊聯合照護工作坊",
    courseDate: "2026-05-20",
    category: Category.TEAM,
    hours: 3 // 團隊合作 3 小時，符合 2~3
  },
  // 缺 災難醫學 1 小時

  // --- S1003 (張嘉豪, 2026-03-15 到職) PGY1 剛起步 ---
  {
    id: "rec_1003_1",
    studentId: "S1003",
    courseName: "新進 PGY 倫理與法律通識教育",
    courseDate: "2026-04-01",
    category: Category.ETHICS,
    hours: 2
  },
  {
    id: "rec_1003_2",
    studentId: "S1003",
    courseName: "手部衛生與抗藥性病菌防護指引",
    courseDate: "2026-04-22",
    category: Category.INFECTION,
    hours: 2
  },

  // --- S1004 (王斯哲, 2024-07-01 到職) PGY1 與 PGY2 全部大功告成 ---
  // PGY1 期間: 2024-07-01 ~ 2025-06-30
  {
    id: "rec_1004_1",
    studentId: "S1004",
    courseName: "醫學倫理",
    courseDate: "2024-08-01",
    category: Category.ETHICS,
    hours: 3
  },
  {
    id: "rec_1004_2",
    studentId: "S1004",
    courseName: "實證醫學入門",
    courseDate: "2024-09-01",
    category: Category.EBM,
    hours: 2.5
  },
  {
    id: "rec_1004_3",
    studentId: "S1004",
    courseName: "感染控制講習",
    courseDate: "2024-10-01",
    category: Category.INFECTION,
    hours: 3
  },
  {
    id: "rec_1004_4",
    studentId: "S1004",
    courseName: "品管概念與 RCA",
    courseDate: "2024-11-01",
    category: Category.QUALITY,
    hours: 2
  },
  {
    id: "rec_1004_5",
    studentId: "S1004",
    courseName: "病歷書寫規範",
    courseDate: "2024-12-01",
    category: Category.RECORD,
    hours: 2.5
  },
  {
    id: "rec_1004_6",
    studentId: "S1004",
    courseName: "團隊合作照護",
    courseDate: "2025-01-01",
    category: Category.TEAM,
    hours: 2
  },
  {
    id: "rec_1004_7",
    studentId: "S1004",
    courseName: "災難應變實務",
    courseDate: "2025-02-01",
    category: Category.DISASTER,
    hours: 1
  },
  {
    id: "rec_1004_8",
    studentId: "S1004",
    courseName: "倫理、法規與隱私維護",
    courseDate: "2025-03-01",
    category: Category.ETHICS,
    hours: 1
  },
  // PGY2 期間: 2025-07-01 ~ 2026-06-30
  {
    id: "rec_1004_9",
    studentId: "S1004",
    courseName: "PGY2 進階醫學倫理研討會",
    courseDate: "2025-08-15",
    category: Category.ETHICS,
    hours: 3
  },
  {
    id: "rec_1004_10",
    studentId: "S1004",
    courseName: "PGY2 醫療品質與病人安全精進研習",
    courseDate: "2025-11-20",
    category: Category.QUALITY,
    hours: 3
  },
  {
    id: "rec_1004_11",
    studentId: "S1004",
    courseName: "PGY2 跨領域跨團隊模擬急救照護與溝通",
    courseDate: "2026-03-10",
    category: Category.TEAM,
    hours: 2.5
  }
];
