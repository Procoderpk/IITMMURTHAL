
import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Languages,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  RotateCcw,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const copy = {
  en: {
    title: "Medical Report Analyzer",
    subtitle: "Understand your report in simpler language.",
    upload: "Choose a PDF, JPG, or PNG",
    choose: "Select report",
    analyze: "Analyze report",
    analyzing: "Analyzing report...",
    findings: "Report findings",
    summary: "Summary",
    questions: "Questions for your doctor",
    limitations: "Limitations and uncertainties",
    urgent: "Prompt professional review",
    disclaimer: "AI explanation only — not a diagnosis or treatment plan.",
    empty: "No report analyzed yet.",
    tryAgain: "Analyze another report",
    doctor: "Discuss these findings with a qualified healthcare professional.",
  },
  hi: {
    title: "मेडिकल रिपोर्ट विश्लेषक",
    subtitle: "अपनी रिपोर्ट को आसान हिंदी/हिंग्लिश में समझें।",
    upload: "PDF, JPG या PNG चुनें",
    choose: "रिपोर्ट चुनें",
    analyze: "रिपोर्ट का विश्लेषण करें",
    analyzing: "रिपोर्ट का विश्लेषण हो रहा है...",
    findings: "रिपोर्ट के परिणाम",
    summary: "सारांश",
    questions: "डॉक्टर से पूछने वाले सवाल",
    limitations: "सीमाएँ और अनिश्चितताएँ",
    urgent: "डॉक्टर से जल्द समीक्षा करवाएँ",
    disclaimer: "AI की व्याख्या है, निदान या इलाज की योजना नहीं।",
    empty: "अभी कोई रिपोर्ट विश्लेषित नहीं हुई है।",
    tryAgain: "दूसरी रिपोर्ट का विश्लेषण करें",
    doctor: "इन परिणामों पर योग्य स्वास्थ्य विशेषज्ञ से चर्चा करें।",
  },
};

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

export default function MedicalReportAnalyzer() {
  const [language, setLanguage] = useState("en");
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const t = copy[language];

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    setError("");
    setAnalysis(null);

    if (!selected) {
      setFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(selected.type)) {
      setFile(null);
      setError("Please choose a PDF, JPG, or PNG file.");
      event.target.value = "";
      return;
    }

    if (selected.size > 8 * 1024 * 1024) {
      setFile(null);
      setError("The report must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function submitReport(event) {
    event.preventDefault();
    setError("");
    setAnalysis(null);

    if (!file) {
      setError("Please choose a report first.");
      return;
    }

    const token = sessionStorage.getItem("jr_token");

    if (!token) {
      setError("Please log in again to analyze your report.");
      return;
    }

    const formData = new FormData();
    formData.append("report", file);
    formData.append("language", language);

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/medical-reports/analyze`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem("jr_token");
          sessionStorage.removeItem("jr_user");
        }
        throw new Error(data.message || "Report analysis failed.");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setAnalysis(null);
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-teal-900 to-teal-700 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-200">
              JEEVAN RAKSHAK AI
            </p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">
              {t.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-teal-50">
              {t.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
            <Languages size={18} className="mx-2" />
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                language === "en" ? "bg-white text-teal-900" : "text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("hi")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                language === "hi" ? "bg-white text-teal-900" : "text-white"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>

      <form
        onSubmit={submitReport}
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
      >
        <label
          htmlFor="medical-report-file"
          className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-5 py-9 text-center hover:bg-teal-50"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-teal-700 shadow-sm">
            <UploadCloud size={28} />
          </span>
          <span className="mt-4 font-bold text-slate-800">{t.upload}</span>
          <span className="mt-2 text-xs text-slate-500">
            Maximum file size: 8 MB
          </span>
          <span className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">
            {t.choose}
          </span>
          <input
            ref={inputRef}
            id="medical-report-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="sr-only"
            onChange={chooseFile}
          />
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <FileText className="shrink-0 text-teal-700" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB · Temporary processing
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setAnalysis(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-sm font-semibold text-slate-600 underline"
            >
              Remove
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <LoaderCircle className="animate-spin" size={19} />
              {t.analyzing}
            </>
          ) : (
            <>
              <FileText size={19} />
              {t.analyze}
            </>
          )}
        </button>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          {t.disclaimer} The report is processed in memory by this application
          and sent to the configured AI provider for analysis. Do not upload
          a report unless you have permission to share it.
        </p>
      </form>

      {!analysis && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {t.empty}
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          {analysis.urgentReviewSuggested && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <AlertTriangle className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">{t.urgent}</p>
                <p className="mt-1 text-sm leading-6">
                  The report may contain a result that needs prompt professional
                  review. The AI flag is not a diagnosis. Seek emergency care
                  for severe symptoms.
                </p>
              </div>
            </div>
          )}

          <Section title={t.summary}>
            <p>{analysis.summary}</p>
            <p className="mt-3 text-xs text-slate-500">
              Report type: {analysis.reportType || "Unknown"}
            </p>
          </Section>

          <Section title={t.findings}>
            {analysis.findings.length === 0 ? (
              <p>No reliable findings could be extracted. Check the source report.</p>
            ) : (
              <div className="space-y-3">
                {analysis.findings.map((finding, index) => {
                  const statusText = {
                    high: "High",
                    low: "Low",
                    within_range: "Within reported range",
                    unclear: "Unclear",
                  }[finding.status] || "Needs verification";

                  return (
                    <article
                      key={`${finding.test}-${index}`}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900">
                          {finding.test || "Unidentified test"}
                        </h4>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {statusText}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Value: {finding.value || "Unclear"}{" "}
                        {finding.unit || ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Reference range: {finding.referenceRange || "Not provided"}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {finding.explanation}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title={t.questions}>
            <ul className="list-disc space-y-2 pl-5">
              {analysis.questionsForDoctor.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </Section>

          <Section title={t.limitations}>
            <ul className="list-disc space-y-2 pl-5">
              {analysis.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </Section>

          <div className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" />
            <div className="text-sm leading-6 text-teal-950">
              <p className="font-bold">{t.doctor}</p>
              <p className="mt-1">{t.disclaimer}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAnalysis(null);
              setFile(null);
              setError("");
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw size={17} />
            {t.tryAgain}
          </button>
        </div>
      )}
    </div>
  );
}
