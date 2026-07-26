"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Trash2, FileText, Loader2, ArrowLeft, RefreshCw, Check, Pencil } from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";

const CATEGORIES = [
  "Pathology Reports",
  "Imaging Reports",
  "Lab Results",
  "Genetic Testing",
  "Biopsy Reports",
  "Operative Reports",
  "Treatment Plans",
  "Insurance Letters",
  "Clinical Trial Documents",
  "Medical Bills",
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("binder");
  const [showUpload, setShowUpload] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  const [extractStep, setExtractStep] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [pendingDocId, setPendingDocId] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const sessionId = getOrCreateSessionId();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("session_id", sessionId)
      .order("uploaded_at", { ascending: false });

    if (!error) setDocuments(data || []);
    setLoading(false);
  }

  function fileToBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function guessMediaType(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "png") return "image/png";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    return "application/octet-stream";
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const sessionId = getOrCreateSessionId();
      const filePath = `${sessionId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        setUploading(false);
        return;
      }

      const base64Data = await fileToBase64(file);
      const mediaType = file.type;

      let explanation = "";
      try {
        const res = await fetch("/api/document-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Data, mediaType, category }),
        });
        const data = await res.json();
        explanation = data.explanation || "";
      } catch (err) {
        console.error("explain failed", err);
      }

      const { data: insertData, error: insertError } = await supabase
        .from("documents")
        .insert({
          session_id: sessionId,
          category,
          file_name: file.name,
          file_path: filePath,
          explanation,
        })
        .select();

      if (insertError) {
        console.error(insertError);
        setUploading(false);
        return;
      }

      const newDoc = insertData[0];

      let events = [];
      try {
        const res = await fetch("/api/document-timeline-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Data, mediaType }),
        });
        const data = await res.json();
        events = data.events || [];
      } catch (err) {
        console.error("extraction failed", err);
      }

      setFile(null);
      setShowUpload(false);
      await loadDocuments();

      if (events.length > 0) {
        setExtractedEvents(events.map((e) => ({ ...e, include: true })));
        setPendingDocId(newDoc.id);
        setExtractStep(true);
      }
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  }

  function updateExtractedEvent(index, field, value) {
    setExtractedEvents((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  }

  function toggleExtractedEvent(index) {
    setExtractedEvents((prev) =>
      prev.map((e, i) => (i === index ? { ...e, include: !e.include } : e))
    );
  }

  async function handleConfirmEvents() {
    const sessionId = getOrCreateSessionId();
    const toSave = extractedEvents.filter((e) => e.include && e.date && e.title);

    if (toSave.length > 0) {
      const { error } = await supabase.from("timeline_events").insert(
        toSave.map((e) => ({
          session_id: sessionId,
          event_date: e.date,
          title: e.title,
          source_document_id: pendingDocId,
        }))
      );
      if (error) console.error(error);
    }

    setExtractStep(false);
    setExtractedEvents([]);
    setPendingDocId(null);
  }

  function handleSkipEvents() {
    setExtractStep(false);
    setExtractedEvents([]);
    setPendingDocId(null);
  }

  async function handleDelete(doc) {
    const confirmed = window.confirm("Delete this document? This can't be undone.");
    if (!confirmed) return;

    await supabase.storage.from("documents").remove([doc.file_path]);

    const sessionId = getOrCreateSessionId();
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id)
      .eq("session_id", sessionId);

    if (error) {
      console.error(error);
      return;
    }
    if (selected && selected.id === doc.id) setSelected(null);
    await loadDocuments();
  }

  async function getDownloadUrl(doc) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60 * 10);
    if (error) {
      console.error(error);
      return null;
    }
    return data.signedUrl;
  }

  async function handleOpen(doc) {
    const url = await getDownloadUrl(doc);
    if (url) window.open(url, "_blank");
  }

  async function handleRetryExplanation(doc) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError) {
      console.error(downloadError);
      return null;
    }

    const base64Data = await blobToBase64(fileData);
    const mediaType = fileData.type || guessMediaType(doc.file_name);

    const res = await fetch("/api/document-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Data, mediaType, category: doc.category }),
    });
    const data = await res.json();
    const explanation = data.explanation || "";

    const sessionId = getOrCreateSessionId();
    const { error: updateError } = await supabase
      .from("documents")
      .update({ explanation })
      .eq("id", doc.id)
      .eq("session_id", sessionId);

    if (updateError) {
      console.error(updateError);
      return null;
    }

    await loadDocuments();
    return explanation;
  }

  if (extractStep) {
    return (
      <ExtractConfirm
        events={extractedEvents}
        onUpdate={updateExtractedEvent}
        onToggle={toggleExtractedEvent}
        onConfirm={handleConfirmEvents}
        onSkip={handleSkipEvents}
      />
    );
  }

  if (selected) {
    return (
      <DocumentDetail
        doc={selected}
        onBack={() => setSelected(null)}
        onOpen={() => handleOpen(selected)}
        onDelete={() => handleDelete(selected)}
        onRetry={handleRetryExplanation}
        onUpdated={(updatedDoc) => setSelected(updatedDoc)}
      />
    );
  }

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    docs: documents.filter((d) => d.category === cat),
  })).filter((g) => g.docs.length > 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Medical Documents</h1>
        <button style={styles.addButton} onClick={() => setShowUpload(true)}>
          <Plus size={20} />
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(view === "binder" ? styles.tabActive : {}) }}
          onClick={() => setView("binder")}
        >
          Binder
        </button>
        <button
          style={{ ...styles.tab, ...(view === "timeline" ? styles.tabActive : {}) }}
          onClick={() => setView("timeline")}
        >
          Timeline
        </button>
      </div>

      {showUpload && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>Upload document</span>
              <button style={styles.closeButton} onClick={() => setShowUpload(false)}>
                <X size={20} />
              </button>
            </div>

            <select
              style={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ marginBottom: "12px" }}
            />

            <button style={styles.saveButton} onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? "Uploading & reading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {loading && <p style={styles.empty}>Loading...</p>}
      {!loading && documents.length === 0 && (
        <p style={styles.empty}>No documents yet. Tap + to upload one.</p>
      )}

      {!loading && view === "binder" && (
        <div style={styles.binder}>
          {grouped.map((g) => (
            <div key={g.category} style={styles.section}>
              <div style={styles.sectionLabel}>{g.category}</div>
              <div style={styles.list}>
                {g.docs.map((d) => (
                  <div key={d.id} style={styles.card} onClick={() => setSelected(d)}>
                    <FileText size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={styles.cardTitle}>{d.file_name}</div>
                      <div style={styles.cardDate}>
                        {new Date(d.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && view === "timeline" && (
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {documents.map((d) => (
            <div key={d.id} style={styles.timelineItem} onClick={() => setSelected(d)}>
              <div style={styles.dot} />
              <div style={styles.eventDate}>
                {new Date(d.uploaded_at).toLocaleDateString()}
              </div>
              <div style={styles.eventTitle}>
                <FileText size={14} style={{ marginRight: "6px", verticalAlign: "-2px" }} />
                {d.file_name}
              </div>
              <div style={styles.eventCategory}>{d.category}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExtractConfirm({ events, onUpdate, onToggle, onConfirm, onSkip }) {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>We found some events</h1>
      <p style={styles.subheadingText}>
        Review and edit before adding these to your timeline. Uncheck anything that's wrong or not relevant.
      </p>

      <div style={styles.list}>
        {events.map((ev, i) => (
          <div key={i} style={styles.extractCard}>
            <div style={styles.extractRow}>
              <button
                style={{
                  ...styles.checkBox,
                  ...(ev.include ? styles.checkBoxOn : {}),
                }}
                onClick={() => onToggle(i)}
              >
                {ev.include && <Check size={13} color="#fff" />}
              </button>
              <div style={{ flex: 1 }}>
                <input
                  style={styles.extractDateInput}
                  type="date"
                  value={ev.date}
                  onChange={(e) => onUpdate(i, "date", e.target.value)}
                />
                <input
                  style={styles.extractTitleInput}
                  type="text"
                  value={ev.title}
                  onChange={(e) => onUpdate(i, "title", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.extractActions}>
        <button style={styles.skipButton} onClick={onSkip}>
          Skip
        </button>
        <button style={styles.saveButton} onClick={onConfirm}>
          Add to timeline
        </button>
      </div>
    </div>
  );
}

function DocumentDetail({ doc, onBack, onOpen, onDelete, onRetry, onUpdated }) {
  const [retrying, setRetrying] = useState(false);
  const [localExplanation, setLocalExplanation] = useState(doc.explanation);

  const failed =
    !localExplanation ||
    localExplanation.startsWith("Sorry, we couldn't read this document");

  async function handleRetryClick() {
    setRetrying(true);
    const newExplanation = await onRetry(doc);
    if (newExplanation !== null) {
      setLocalExplanation(newExplanation);
      onUpdated({ ...doc, explanation: newExplanation });
    }
    setRetrying(false);
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        <ArrowLeft size={16} style={{ marginRight: "6px" }} />
        Back to documents
      </button>

      <h1 style={styles.heading}>{doc.file_name}</h1>
      <div style={styles.cardDate}>{doc.category}</div>

      <div style={styles.actionRow}>
        <button style={styles.saveButton} onClick={onOpen}>
          Open document
        </button>
        <button style={styles.deleteButton} onClick={onDelete}>
          <Trash2 size={16} style={{ marginRight: "6px" }} />
          Delete
        </button>
      </div>

      <div style={styles.sectionRow}>
        <div style={styles.sectionLabel}>Plain-language explanation</div>
        {failed && (
          <button style={styles.retryButton} onClick={handleRetryClick} disabled={retrying}>
            {retrying ? (
              <Loader2 size={13} className="spin" style={{ marginRight: "5px" }} />
            ) : (
              <RefreshCw size={13} style={{ marginRight: "5px" }} />
            )}
            {retrying ? "Retrying…" : "Retry explanation"}
          </button>
        )}
      </div>

      <div style={styles.infoCard}>
        {localExplanation ? (
          <p style={styles.infoText}>{localExplanation}</p>
        ) : (
          <p style={styles.infoText}>No explanation available for this document.</p>
        )}
        <p style={styles.disclaimer}>
          This is general educational information, not medical advice. Talk to your
          care team about your specific results.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  heading: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  subheadingText: { fontSize: "13px", color: "#6E726A", marginBottom: "18px" },
  addButton: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  tabs: { display: "flex", gap: "8px", marginBottom: "18px" },
  tab: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    color: "#6E726A",
  },
  tabActive: { background: "#111", color: "#fff", borderColor: "#111" },
  backButton: {
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    color: "#3F628F",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    marginBottom: "16px",
  },
  formOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  formCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    width: "90%",
    maxWidth: "360px",
  },
  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  formTitle: { fontWeight: 700, fontSize: "16px" },
  closeButton: { background: "none", border: "none", cursor: "pointer" },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  saveButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  skipButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    color: "#6E726A",
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  deleteButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    color: "#A32D2D",
    fontWeight: 600,
    cursor: "pointer",
  },
  actionRow: { display: "flex", gap: "10px", margin: "16px 0" },
  empty: { color: "#999", fontSize: "14px", textAlign: "center", marginTop: "40px" },
  binder: { display: "flex", flexDirection: "column", gap: "20px" },
  section: {},
  sectionLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#9A9A90",
    margin: "0 0 8px",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  card: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    background: "#FCFBF8",
  },
  cardTitle: { fontSize: "13.5px", fontWeight: 600 },
  cardDate: { fontSize: "12px", color: "#9A9A90", marginTop: "2px" },
  timeline: { position: "relative", paddingLeft: "24px" },
  timelineLine: {
    position: "absolute",
    left: "6px",
    top: "6px",
    bottom: "6px",
    width: "2px",
    background: "#E1DDD2",
  },
  timelineItem: { position: "relative", marginBottom: "20px", cursor: "pointer" },
  dot: {
    position: "absolute",
    left: "-24px",
    top: "4px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#378ADD",
  },
  eventDate: { fontSize: "12px", color: "#9A9A90", marginBottom: "2px" },
  eventTitle: { fontSize: "14px", fontWeight: 600 },
  eventCategory: { fontSize: "12.5px", color: "#3F628F", marginTop: "2px" },
  infoCard: {
    background: "#FCFBF8",
    border: "1px solid #E1DDD2",
    borderRadius: "12px",
    padding: "14px",
  },
  infoText: { fontSize: "13.5px", color: "#444", lineHeight: 1.6, margin: "0 0 10px" },
  disclaimer: { fontSize: "12px", color: "#9A9A90", margin: 0 },
  sectionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 8px" },
  retryButton: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #E1DDD2",
    borderRadius: "8px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#3F628F",
    cursor: "pointer",
  },
  extractCard: {
    border: "1px solid #E1DDD2",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FCFBF8",
  },
  extractRow: { display: "flex", alignItems: "flex-start", gap: "10px" },
  checkBox: {
    width: "20px",
    height: "20px",
    borderRadius: "5px",
    border: "1px solid #E1DDD2",
    background: "#fff",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "4px",
  },
  checkBoxOn: { background: "#111", borderColor: "#111" },
  extractDateInput: {
    width: "100%",
    padding: "6px 8px",
    marginBottom: "6px",
    borderRadius: "6px",
    border: "1px solid #E1DDD2",
    fontSize: "12.5px",
  },
  extractTitleInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #E1DDD2",
    fontSize: "13.5px",
    fontWeight: 600,
  },
  extractActions: { display: "flex", gap: "10px", marginTop: "16px" },
};