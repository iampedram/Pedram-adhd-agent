import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  bg: "#0d1117",
  surface: "#161b22",
  card: "#1c2333",
  border: "#30363d",
  accent: "#2d6a4f",
  gold: "#e9c46a",
  red: "#e63946",
  blue: "#457b9d",
  text: "#e6edf3",
  muted: "#8b949e",
  dim: "#484f58",
};

const PHASES = [
  { name: "زیرساخت", weeks: ["سیستم‌سازی", "محتوای اول", "خروجی اول", "مرور ماه"] },
  { name: "ساختن", weeks: ["مومنتوم", "انتشار اول", "پادکست ۱", "مرور ماه"] },
  { name: "اثبات", weeks: ["عمق", "انتشار عمومی", "اولین مشتری", "مایلستون"] },
  { name: "گسترش", weeks: ["پورتفولیو", "پادکست ۲", "قیمت‌گذاری", "مرور مالی"] },
  { name: "عمق", weeks: ["بهترین کار", "یادگیری", "پادکست ۳", "مرور عمق"] },
  { name: "جمع‌بندی", weeks: ["مرور کلی", "ارزیابی", "استراتژی", "رودمپ بعدی"] },
];

const STORAGE_KEYS = {
  checkins: "pedram-checkins",
  tasks: "pedram-tasks",
  progress: "pedram-progress",
  ideas: "pedram-ideas",
};

function useStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });
  const save = (v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [val, save];
}

function LoadingDots() {
  return <span style={{ color: COLORS.gold }}>...</span>;
}

async function askClaude(prompt) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: `تو یه مربی ADHD برای پدرام هستی. پدرام ۲۷ ساله، پرستار در اصفهان، ADHD داره و ریتالین مصرف می‌کنه.
داره روی یه رودمپ ۶ ماهه کار می‌کنه: متخصص تولید محتوا در حوزه سلامت + پادکست پشت‌وُرو + کلینیک زخم.
ضعف‌های اصلیش: واقعیت‌سنجی پایین، ابراز وجود ضعیف، تمایل به ایده‌های جدید به جای تداوم.
لحن تو: صادق، بدون تعریف اضافه، مستقیم. فارسی جواب بده. کوتاه و عملی.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "خطا در اتصال.";
  } catch {
    return "اتصال برقرار نشد.";
  }
}

// ─── TABS ───────────────────────────────────────────────────────────
function CheckInTab({ checkins, setCheckins }) {
  const [focus, setFocus] = useState(5);
  const [procr, setProcr] = useState(5);
  const [note, setNote] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setLoading(true);
    setSaved(false);
    const now = new Date();
    const entry = {
      date: now.toLocaleDateString("fa-IR"),
      time: now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      ts: now.toISOString(),
      focus,
      procr,
      note,
    };
    const updated = [...checkins, entry].slice(-60);
    setCheckins(updated);

    const reply = await askClaude(
      `چک‌این پدرام:
تمرکز: ${focus}/10
اهمال‌کاری: ${procr}/10
یادداشت: ${note || "ندارم"}

یه بازخورد کوتاه بده. اگه تمرکز پایین یا اهمال‌کاری بالاست، مستقیم بگو چرا احتمالاً این‌طوری شده و یه قدم فوری پیشنهاد بده.`
    );
    setAiReply(reply);
    setLoading(false);
    setSaved(true);
    setNote("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>چک‌این امروز</div>

        <SliderInput label="تمرکز" value={focus} onChange={setFocus}
          leftLabel="پراکنده" rightLabel="متمرکز" color={COLORS.accent} />
        <SliderInput label="اهمال‌کاری" value={procr} onChange={setProcr}
          leftLabel="فعال" rightLabel="اهمال‌کار" color={COLORS.red} />

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="یادداشت اختیاری..."
          style={styles.textarea}
        />

        <button onClick={submit} disabled={loading} style={styles.btn}>
          {loading ? "در حال تحلیل..." : "ثبت چک‌این"}
        </button>
        {saved && <div style={{ color: COLORS.accent, fontSize: 13, marginTop: 8 }}>✓ ثبت شد</div>}
      </div>

      {aiReply && (
        <div style={{ ...styles.card, borderColor: COLORS.gold, borderWidth: 1, borderStyle: "solid" }}>
          <div style={styles.cardTitle}>بازخورد مربی</div>
          <p style={{ color: COLORS.text, lineHeight: 1.8, fontSize: 14, whiteSpace: "pre-wrap" }}>{aiReply}</p>
        </div>
      )}
    </div>
  );
}

function ChartsTab({ checkins }) {
  if (checkins.length < 2) {
    return (
      <div style={styles.card}>
        <div style={{ color: COLORS.muted, textAlign: "center", padding: 40 }}>
          حداقل ۲ چک‌این لازمه تا نمودار نشون داده بشه.
        </div>
      </div>
    );
  }

  const data = checkins.slice(-14).map(c => ({
    name: c.date,
    تمرکز: c.focus,
    "اهمال‌کاری": c.procr,
  }));

  const avgFocus = (checkins.reduce((s, c) => s + c.focus, 0) / checkins.length).toFixed(1);
  const avgProcr = (checkins.reduce((s, c) => s + c.procr, 0) / checkins.length).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatBox label="میانگین تمرکز" value={`${avgFocus}/10`} color={COLORS.accent} />
        <StatBox label="میانگین اهمال‌کاری" value={`${avgProcr}/10`} color={COLORS.red} />
        <StatBox label="تعداد چک‌این‌ها" value={checkins.length} color={COLORS.blue} />
        <StatBox label="روزهای ردیابی" value={new Set(checkins.map(c => c.date)).size} color={COLORS.gold} />
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>روند ۱۴ چک‌این اخیر</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 10 }} />
            <YAxis domain={[0, 10]} tick={{ fill: COLORS.muted, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="تمرکز" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="اهمال‌کاری" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>آخرین چک‌این‌ها</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {checkins.slice(-5).reverse().map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.muted, fontSize: 12, minWidth: 80 }}>{c.date} {c.time}</span>
              <span style={{ color: COLORS.accent, fontSize: 13 }}>تمرکز: {c.focus}</span>
              <span style={{ color: COLORS.red, fontSize: 13 }}>اهمال: {c.procr}</span>
              {c.note && <span style={{ color: COLORS.muted, fontSize: 12 }}>{c.note}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksTab({ tasks, setTasks }) {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [input3, setInput3] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString("fa-IR");
  const todayTasks = tasks[today] || { t1: "", t2: "", t3: "", done: [] };

  useEffect(() => {
    setInput1(todayTasks.t1 || "");
    setInput2(todayTasks.t2 || "");
    setInput3(todayTasks.t3 || "");
  }, [today]);

  const saveTasks = async () => {
    if (!input1 && !input2 && !input3) return;
    setLoading(true);
    const updated = { ...tasks, [today]: { t1: input1, t2: input2, t3: input3, done: todayTasks.done } };
    setTasks(updated);

    const reply = await askClaude(
      `پدرام سه تسک امروزش رو ثبت کرد:
۱. ${input1 || "-"}
۲. ${input2 || "-"}
۳. ${input3 || "-"}

بررسی کن: آیا این تسک‌ها با رودمپ ۶ ماهه‌اش همخوانی دارن؟ (کار محتوا، پادکست پشت‌وُرو، کلینیک زخم، مهارت گفتار)
اگه یه تسک مشکوکه یا خارج از مسیره، مستقیم بگو.`
    );
    setAiReply(reply);
    setLoading(false);
  };

  const toggleDone = (idx) => {
    const done = todayTasks.done || [];
    const updated = done.includes(idx) ? done.filter(d => d !== idx) : [...done, idx];
    const newTasks = { ...tasks, [today]: { ...todayTasks, done: updated } };
    setTasks(newTasks);
  };

  const taskList = [input1, input2, input3].filter(Boolean);
  const doneCount = (todayTasks.done || []).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>سه تسک امروز</div>
        <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
          فقط سه تا. نه بیشتر. هر شب قبل از خواب برای فردا پر کن.
        </p>
        {[["۱", input1, setInput1], ["۲", input2, setInput2], ["۳", input3, setInput3]].map(([num, val, set], i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: COLORS.gold, fontWeight: "bold", minWidth: 20 }}>{num}</span>
            <input
              value={val}
              onChange={e => set(e.target.value)}
              placeholder={`تسک ${num}...`}
              style={styles.input}
            />
            {val && (
              <button onClick={() => toggleDone(i)} style={{
                ...styles.checkBtn,
                background: (todayTasks.done || []).includes(i) ? COLORS.accent : "transparent",
              }}>✓</button>
            )}
          </div>
        ))}
        {taskList.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ color: COLORS.muted, fontSize: 13 }}>{doneCount}/{taskList.length} انجام شد</span>
          </div>
        )}
        <button onClick={saveTasks} disabled={loading} style={{ ...styles.btn, marginTop: 16 }}>
          {loading ? "در حال بررسی..." : "ثبت و بررسی با مربی"}
        </button>
      </div>

      {aiReply && (
        <div style={{ ...styles.card, borderColor: COLORS.gold, borderWidth: 1, borderStyle: "solid" }}>
          <div style={styles.cardTitle}>بررسی مربی</div>
          <p style={{ color: COLORS.text, lineHeight: 1.8, fontSize: 14, whiteSpace: "pre-wrap" }}>{aiReply}</p>
        </div>
      )}
    </div>
  );
}

function RoadmapTab({ progress, setProgress }) {
  const currentPhase = progress.currentPhase ?? 0;
  const currentWeek = progress.currentWeek ?? 0;
  const completedWeeks = progress.completedWeeks ?? [];

  const toggleWeek = (ph, wk) => {
    const key = `${ph}-${wk}`;
    const updated = completedWeeks.includes(key)
      ? completedWeeks.filter(k => k !== key)
      : [...completedWeeks, key];
    setProgress({ ...progress, completedWeeks: updated });
  };

  const totalWeeks = 24;
  const doneCount = completedWeeks.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...styles.card, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={styles.cardTitle}>پیشرفت کلی</div>
          <div style={{ background: COLORS.border, borderRadius: 8, height: 8, marginTop: 8 }}>
            <div style={{ background: COLORS.accent, height: 8, borderRadius: 8, width: `${(doneCount / totalWeeks) * 100}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{doneCount} از {totalWeeks} هفته</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: COLORS.gold, fontSize: 28, fontWeight: "bold" }}>{Math.round((doneCount / totalWeeks) * 100)}%</div>
          <div style={{ color: COLORS.muted, fontSize: 12 }}>تکمیل شده</div>
        </div>
      </div>

      {PHASES.map((phase, ph) => (
        <div key={ph} style={{ ...styles.card, opacity: ph > currentPhase ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ background: phaseColor(ph), borderRadius: 6, padding: "2px 10px", fontSize: 12, color: "#fff", fontWeight: "bold" }}>
                فاز {ph + 1}
              </div>
              <div style={{ color: COLORS.text, fontWeight: "bold" }}>{phase.name}</div>
            </div>
            <div style={{ color: COLORS.muted, fontSize: 12 }}>
              {phase.weeks.filter((_, wk) => completedWeeks.includes(`${ph}-${wk}`)).length}/{phase.weeks.length}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {phase.weeks.map((week, wk) => {
              const key = `${ph}-${wk}`;
              const done = completedWeeks.includes(key);
              return (
                <button key={wk} onClick={() => toggleWeek(ph, wk)} style={{
                  background: done ? phaseColor(ph) + "33" : COLORS.bg,
                  border: `1px solid ${done ? phaseColor(ph) : COLORS.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: done ? phaseColor(ph) : COLORS.muted,
                  fontSize: 12,
                  textAlign: "right",
                  cursor: "pointer",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}>
                  <span>{done ? "✓" : "○"}</span>
                  <span>هفته {(ph * 4) + wk + 1}: {week}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function IdeasTab({ ideas, setIdeas }) {
  const [input, setInput] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(null);

  const addIdea = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const idea = { text: input, date: new Date().toLocaleDateString("fa-IR"), status: "در بررسی", aiComment: "" };
    const updated = [idea, ...ideas];

    const reply = await askClaude(
      `پدرام یه ایده جدید داره:
"${input}"

بررسی کن آیا این ایده با رودمپ ۶ ماهه‌اش همخوانی داره؟
رودمپ: تولید محتوای حوزه سلامت، پادکست پشت‌وُرو، کلینیک زخم.
اگه این ایده یه حواس‌پرتی ADHDیه، مستقیم بگو.
اگه می‌تونه با رودمپ ادغام بشه، بگو چطور.
اگه واقعاً خوبه ولی الان وقتش نیست، بگو کِی.`
    );

    updated[0] = { ...idea, aiComment: reply };
    setIdeas(updated);
    setAiReply(reply);
    setLoading(false);
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>پارکینگ ایده‌ها</div>
        <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
          ایده جدید داری؟ قبل از عمل کردن اینجا بنویسش. مربی بررسی می‌کنه آیا از رودمپت خارج میشه.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="ایده جدیدت رو بنویس..."
            style={{ ...styles.input, flex: 1 }}
            onKeyDown={e => e.key === "Enter" && addIdea()}
          />
          <button onClick={addIdea} disabled={loading} style={styles.btn}>
            {loading ? "..." : "بررسی"}
          </button>
        </div>
      </div>

      {aiReply && (
        <div style={{ ...styles.card, borderColor: COLORS.gold, borderWidth: 1, borderStyle: "solid" }}>
          <div style={styles.cardTitle}>نظر مربی</div>
          <p style={{ color: COLORS.text, lineHeight: 1.8, fontSize: 14, whiteSpace: "pre-wrap" }}>{aiReply}</p>
        </div>
      )}

      {ideas.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>ایده‌های ثبت‌شده</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ideas.map((idea, i) => (
              <div key={i} style={{ padding: 12, background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.text, fontSize: 14 }}>{idea.text}</span>
                  <span style={{ color: COLORS.muted, fontSize: 11 }}>{idea.date}</span>
                </div>
                {idea.aiComment && (
                  <button onClick={() => setActiveIdx(activeIdx === i ? null : i)} style={{ background: "none", border: "none", color: COLORS.gold, fontSize: 12, cursor: "pointer", marginTop: 6, padding: 0 }}>
                    {activeIdx === i ? "بستن نظر مربی" : "نظر مربی ▼"}
                  </button>
                )}
                {activeIdx === i && (
                  <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 8, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{idea.aiComment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────
function SliderInput({ label, value, onChange, leftLabel, rightLabel, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: COLORS.text, fontSize: 14 }}>{label}</span>
        <span style={{ color, fontWeight: "bold", fontSize: 18 }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: COLORS.muted, fontSize: 11 }}>{leftLabel}</span>
        <span style={{ color: COLORS.muted, fontSize: 11 }}>{rightLabel}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ ...styles.card, textAlign: "center", padding: "16px 8px" }}>
      <div style={{ color, fontSize: 24, fontWeight: "bold" }}>{value}</div>
      <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function phaseColor(ph) {
  return ["#264653","#2a9d8f","#e9c46a","#f4a261","#e76f51","#533483"][ph] || COLORS.accent;
}

const TABS = [
  { id: "checkin", label: "چک‌این" },
  { id: "charts", label: "نمودار" },
  { id: "tasks", label: "تسک‌ها" },
  { id: "roadmap", label: "رودمپ" },
  { id: "ideas", label: "ایده‌ها" },
];

// ─── MAIN ────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("checkin");
  const [checkins, setCheckins] = useStorage(STORAGE_KEYS.checkins, []);
  const [tasks, setTasks] = useStorage(STORAGE_KEYS.tasks, {});
  const [progress, setProgress] = useStorage(STORAGE_KEYS.progress, { currentPhase: 0, currentWeek: 0, completedWeeks: [] });
  const [ideas, setIdeas] = useStorage(STORAGE_KEYS.ideas, []);

  const today = new Date().toLocaleDateString("fa-IR");
  const todayCheckins = checkins.filter(c => c.date === today).length;
  const todayTasks = tasks[today];
  const doneTasks = (todayTasks?.done || []).length;
  const totalTasks = [todayTasks?.t1, todayTasks?.t2, todayTasks?.t3].filter(Boolean).length;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", direction: "rtl", color: COLORS.text }}>
      {/* Header */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: COLORS.gold }}>پدرام | مربی ADHD</div>
            <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{today}</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: COLORS.accent, fontWeight: "bold" }}>{todayCheckins}</div>
              <div style={{ color: COLORS.muted, fontSize: 10 }}>چک‌این</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: COLORS.gold, fontWeight: "bold" }}>{doneTasks}/{totalTasks}</div>
              <div style={{ color: COLORS.muted, fontSize: 10 }}>تسک</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: COLORS.blue, fontWeight: "bold" }}>{progress.completedWeeks?.length || 0}</div>
              <div style={{ color: COLORS.muted, fontSize: 10 }}>هفته</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 20px",
            background: "none",
            border: "none",
            borderBottom: tab === t.id ? `2px solid ${COLORS.gold}` : "2px solid transparent",
            color: tab === t.id ? COLORS.gold : COLORS.muted,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: tab === t.id ? "bold" : "normal",
            whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "checkin" && <CheckInTab checkins={checkins} setCheckins={setCheckins} />}
        {tab === "charts" && <ChartsTab checkins={checkins} />}
        {tab === "tasks" && <TasksTab tasks={tasks} setTasks={setTasks} />}
        {tab === "roadmap" && <RoadmapTab progress={progress} setProgress={setProgress} />}
        {tab === "ideas" && <IdeasTab ideas={ideas} setIdeas={setIdeas} />}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#1c2333",
    borderRadius: 12,
    padding: 20,
    border: `1px solid #30363d`,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#e6edf3",
    marginBottom: 16,
  },
  btn: {
    background: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    width: "100%",
  },
  checkBtn: {
    border: `1px solid #2d6a4f`,
    color: "#fff",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 14,
  },
  input: {
    background: "#0d1117",
    border: `1px solid #30363d`,
    borderRadius: 8,
    padding: "10px 12px",
    color: "#e6edf3",
    fontSize: 14,
    width: "100%",
    direction: "rtl",
  },
  textarea: {
    background: "#0d1117",
    border: `1px solid #30363d`,
    borderRadius: 8,
    padding: "10px 12px",
    color: "#e6edf3",
    fontSize: 14,
    width: "100%",
    minHeight: 80,
    resize: "vertical",
    direction: "rtl",
    marginBottom: 12,
    fontFamily: "system-ui",
  },
};
