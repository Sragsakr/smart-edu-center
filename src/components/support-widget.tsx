"use client";

import { useState } from "react";
import { Headphones, MessageCircle, TicketCheck, X } from "lucide-react";

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div dir="rtl" className="fixed bottom-5 left-5 z-50">
      {open ? (
        <div className="mb-3 w-[290px] rounded-2xl border border-[#e4dff0] bg-white p-4 shadow-2xl shadow-purple-200/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[#17152b]">خدمة العملاء</p>
              <p className="mt-1 text-xs leading-5 text-[#777386]">هنحدد قناة الدعم النهائية هنا: واتساب، محادثة مباشرة أو تذكرة دعم.</p>
            </div>
            <button type="button" aria-label="إغلاق الدعم" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-[#817b92] hover:bg-[#f5f2fb]"><X size={16}/></button>
          </div>
          <div className="mt-4 grid gap-2">
            <button type="button" disabled className="flex items-center gap-3 rounded-xl bg-[#f7f5ff] px-3 py-3 text-right text-xs font-bold text-[#6042d3] disabled:cursor-default disabled:opacity-80"><MessageCircle size={17}/>محادثة مباشرة <span className="mr-auto text-[10px] font-medium text-[#9691a5]">قريبًا</span></button>
            <button type="button" disabled className="flex items-center gap-3 rounded-xl bg-[#faf9fc] px-3 py-3 text-right text-xs font-bold text-[#5f5a70] disabled:cursor-default disabled:opacity-80"><TicketCheck size={17}/>إنشاء تذكرة دعم <span className="mr-auto text-[10px] font-medium text-[#9691a5]">قريبًا</span></button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="خدمة العملاء"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-14 place-items-center rounded-full bg-[#6547d9] text-white shadow-xl shadow-purple-300/60 transition hover:-translate-y-0.5 hover:bg-[#5b3fd0]"
      >
        <Headphones size={24}/>
      </button>
    </div>
  );
}
